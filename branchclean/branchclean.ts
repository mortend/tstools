#!/usr/bin/env node

import { execFileSync } from "node:child_process"

export const colors = {
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    reset: "\x1b[0m",
}

const args = process.argv.slice(2)
const dryRun = args.includes("-n") || args.includes("--dry-run")
const fetchOrigin = !args.includes("--no-fetch")

if (args.includes("-h") || args.includes("--help")) {
    help()
    process.exit(0)
}

main()

/** Deletes local branches that become identical to the main branch after rebase. */
function main() {
    const currentBranch = git(["rev-parse", "--abbrev-ref", "HEAD"])
    const mainRef = getDefaultMainRef()
    const mainBranch = mainRef.replace(/^origin\//, "")

    try {
        if (fetchOrigin && mainRef.startsWith("origin/")) {
            console.log(`${colors.yellow}Fetching origin...${colors.reset}`)
            git(["fetch", "origin"], { showOutput: true })
        }

        const branches = getLocalBranches().filter(
            branch => branch !== currentBranch && branch !== mainBranch,
        )

        for (const branch of branches) {
            processBranch(branch, currentBranch, mainRef)
        }

        checkout(currentBranch)
        console.log(`\n${colors.green}Done.${colors.reset}`)
    } catch (err: any) {
        checkout(currentBranch)
        console.error(`${colors.red}Error:${colors.reset} ${err.message}`)
        process.exit(1)
    }
}

/** Checks one branch and deletes it when it matches the main ref after rebase. */
function processBranch(branch: string, currentBranch: string, mainRef: string) {
    console.log(
        `\n${colors.bold}Processing branch:${colors.reset} ${colors.cyan}${branch}${colors.reset}`,
    )
    checkout(branch)

    if (!tryRebase(mainRef)) return

    const head = git(["rev-parse", "HEAD"])
    const main = git(["rev-parse", mainRef])

    if (head === main) {
        checkout(currentBranch)
        console.log(
            `${colors.green}${branch} matches ${mainRef}.${colors.reset} ${colors.yellow}${dryRun ? "Would delete." : "Deleting..."}${colors.reset}`,
        )

        if (!dryRun) git(["branch", "-D", branch], { showOutput: true })
        return
    }

    console.log(`${colors.dim}${branch} still differs from ${mainRef}. Keeping it.${colors.reset}`)
}

/** Rebases the current branch and aborts if the rebase fails. */
function tryRebase(mainRef: string) {
    try {
        git(["rebase", mainRef], { showOutput: true })
        return true
    } catch {
        console.log(
            `${colors.red}Rebase failed.${colors.reset} ${colors.dim}Resetting...${colors.reset}`,
        )
        tryGit(["rebase", "--abort"], { showOutput: true })
        return false
    }
}

/** Returns all local branch names. */
function getLocalBranches() {
    return git(["branch", "--format=%(refname:short)"])
        .split("\n")
        .map(branch => branch.trim())
        .filter(Boolean)
}

/** Finds the best default main branch ref. */
function getDefaultMainRef() {
    const originHead = tryGit(["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"])
    if (originHead) return originHead

    for (const ref of ["origin/main", "origin/master", "main", "master"]) {
        if (gitRefExists(ref)) return ref
    }

    throw new Error(
        "Could not detect main branch. Pass --no-fetch only after origin/HEAD exists, or create origin/main.",
    )
}

/** Checks out a branch. */
function checkout(branch: string) {
    git(["checkout", branch], { showOutput: true })
}

/** Returns true if the given git ref exists locally. */
function gitRefExists(ref: string) {
    return tryGit(["rev-parse", "--verify", "--quiet", ref]) !== undefined
}

/** Runs git and returns undefined if the command fails. */
function tryGit(args: string[], options: { showOutput?: boolean } = {}) {
    try {
        return git(args, options)
    } catch {
        return undefined
    }
}

/** Runs a git command and returns trimmed stdout. */
function git(args: string[], options: { showOutput?: boolean } = {}) {
    const output = execFileSync("git", args, {
        encoding: "utf8",
        stdio: [
            "ignore",
            options.showOutput ? "inherit" : "pipe",
            options.showOutput ? "inherit" : "pipe",
        ],
    })

    return typeof output === "string" ? output.trim() : ""
}

/** Prints command usage and options. */
function help() {
    console.log(`${colors.bold}${colors.cyan}branchclean${colors.reset}

${colors.dim}Clean up local git branches that become identical to the main branch after rebasing.${colors.reset}

${colors.bold}Usage${colors.reset}
  ${colors.green}branchclean${colors.reset}
  ${colors.green}branchclean${colors.reset} ${colors.yellow}--dry-run${colors.reset}
  ${colors.green}branchclean${colors.reset} ${colors.yellow}--no-fetch${colors.reset}

${colors.bold}Options${colors.reset}
  ${colors.yellow}-h, --help${colors.reset}     Show this help screen
  ${colors.yellow}-n, --dry-run${colors.reset}  Show branches that would be deleted
  ${colors.yellow}--no-fetch${colors.reset}     Skip fetching origin before scanning

${colors.bold}Behavior${colors.reset}
  * Detects the main branch from ${colors.yellow}origin/HEAD${colors.reset}
  * Falls back to ${colors.yellow}origin/main${colors.reset}, ${colors.yellow}origin/master${colors.reset}, ${colors.yellow}main${colors.reset}, then ${colors.yellow}master${colors.reset}
  * Rebases each local branch onto the detected main branch
  * Deletes branches that match the detected main branch after rebase
  * Skips the current branch and the detected main branch
`)
}
