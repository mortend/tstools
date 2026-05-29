#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

const colors = {
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    reset: "\x1b[0m",
}

const args = process.argv.slice(2)

if (args.includes("-h") || args.includes("--help")) {
    help()
    process.exit(0)
}

const filePath = readOption("-f", "--file")
const arg = args.find(arg => !arg.startsWith("-") && arg !== filePath)

const autoCode = !args.includes("-C") && !args.includes("--no-code")
const clipboard = args.includes("-c") || args.includes("--clipboard")

main()

/** Format git commits as Markdown for merge/pull request descriptions. */
function main() {
    const log = filePath
        ? readCommitLogFile(filePath)
        : git(["log", resolveRange(arg), "--reverse", "--format=%x1e%B%x1f"], { showErrors: true })
    const markdown = formatCommits(log)

    if (clipboard) {
        copyToClipboard(markdown)
    } else {
        console.log(markdown)
    }
}

/** Reads commit log input from a raw git log file or a readable test fixture. */
function readCommitLogFile(filePath: string) {
    const text = readFileSync(filePath, "utf8")

    if (text.includes("\x1e") || text.includes("\x1f")) return text

    return text
        .split(/^={3,}\s*$/m)
        .map(commit => commit.trim())
        .filter(Boolean)
        .map(commit => `\x1e${commit}\x1f`)
        .join("")
}

/** Reads an option value from either --name=value or --name value syntax. */
function readOption(shortName: string, longName: string) {
    const valueArg = args.find(arg => arg.startsWith(`${longName}=`))
    if (valueArg) return valueArg.slice(longName.length + 1)

    const shortIndex = args.indexOf(shortName)
    if (shortIndex !== -1) return args[shortIndex + 1]

    const longIndex = args.indexOf(longName)
    if (longIndex !== -1) return args[longIndex + 1]

    return undefined
}

/** Resolves a user argument to a git log range. */
function resolveRange(arg: string | undefined) {
    if (arg === undefined) return `${getDefaultBaseRef()}..HEAD`
    if (/^\d+$/.test(arg)) return `-${arg}`
    return arg
}

/** Formats raw git log output as Markdown sections. */
function formatCommits(log: string) {
    return log
        .split("\x1f")
        .map(x => x.replace(/\x1e/g, "").trim())
        .filter(Boolean)
        .map(formatCommit)
        .join("\n\n")
}

/** Formats one commit message as a Markdown heading and body. */
function formatCommit(commit: string) {
    const [subject = "", ...bodyLines] = commit.split("\n")
    const body = codeify(bodyLines.join("\n").trim())

    return [`### ${subject}`, body].filter(Boolean).join("\n\n")
}

/** Adds inline-code formatting to likely code identifiers. */
function codeify(text: string) {
    if (!autoCode) return text

    return text
        .split(/(`[^`]*`)/g)
        .map(codeifyNonCodeSpan)
        .join("")
}

/** Adds inline-code formatting outside existing backtick spans. */
function codeifyNonCodeSpan(part: string) {
    if (part.startsWith("`") && part.endsWith("`")) return part

    return (
        part
            // Files and paths with a generic alphanumeric extension.
            .replace(/(?<!`)\b([\w./-]*[\w-]+\.[A-Za-z0-9][A-Za-z0-9-]*)\b(?!`)/g, "`$1`")
            // Dotfiles such as .env.
            .replace(/(?<!`)(^|\s)(\.[A-Za-z0-9_-]+)(?!`)/g, "$1`$2`")
            // Environment variables, optionally including simple assignments.
            .replace(/(?<!`)\b([A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+(?:=[^\s`]+)?)\b(?!`)/g, "`$1`")
            // Package scripts or namespaced identifiers such as help:plain.
            .replace(/(?<!`)\b([A-Za-z0-9_-]+:[A-Za-z0-9_:-]+)\b(?!`)/g, "`$1`")
            // Short and long CLI flags such as -r and --rebuild.
            .replace(/(^|\s)(?<!`)(-{1,2}[a-zA-Z0-9][a-zA-Z0-9-]*)(?!`)/g, "$1`$2`")
            // Simple function or method-call expressions without nested parentheses.
            .replace(/(?<!`)\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\([^`()\n]*\))(?!`)/g, "`$1`")
            // Dotted identifiers such as yEditor.saveChanges.
            .replace(/(?<!`)\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+)\b(?!`)/g, "`$1`")
            // camelCase identifiers, while avoiding all-uppercase acronyms.
            .replace(/(?<!`)\b([a-z][A-Za-z0-9_$]*[A-Z][\w$]*)\b(?!`)/g, "`$1`")
    )
}

/** Finds the best default branch to compare the current branch against. */
function getDefaultBaseRef() {
    const upstream = tryGit(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"])
    if (upstream) return upstream

    const originHead = tryGit(["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"])
    if (originHead) return originHead

    for (const ref of ["origin/main", "origin/master", "main", "master"]) {
        if (gitRefExists(ref)) return ref
    }

    throw new Error("Could not detect base branch. Pass a range or number explicitly.")
}

/** Returns true if the given git ref exists locally. */
function gitRefExists(ref: string) {
    return tryGit(["rev-parse", "--verify", "--quiet", ref]) !== undefined
}

/** Runs git and returns undefined if the command fails. */
function tryGit(args: string[]) {
    try {
        return git(args)
    } catch {
        return undefined
    }
}

/** Runs a git command and returns trimmed stdout. */
function git(args: string[], options: { showErrors?: boolean } = {}) {
    return execFileSync("git", args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", options.showErrors ? "inherit" : "ignore"],
    }).trim()
}

/** Copies text to the system clipboard. */
function copyToClipboard(text: string) {
    if (process.platform === "darwin") {
        execFileSync("pbcopy", { input: text })
        return
    }

    if (process.platform === "win32") {
        execFileSync("clip", { input: text })
        return
    }

    try {
        execFileSync("wl-copy", { input: text })
        return
    } catch {}

    try {
        execFileSync("xclip", ["-selection", "clipboard"], { input: text })
        return
    } catch {}

    throw new Error(
        "Could not find a clipboard command. Install wl-copy or xclip, or pipe the output manually.",
    )
}

/** Prints command usage and options. */
function help() {
    console.log(`${colors.bold}${colors.cyan}mergelog${colors.reset}

${colors.dim}Format git log output as Markdown for merge and pull request descriptions.${colors.reset}

${colors.bold}Usage${colors.reset}
  ${colors.green}mergelog${colors.reset}
  ${colors.green}mergelog${colors.reset} ${colors.yellow}3${colors.reset}
  ${colors.green}mergelog${colors.reset} ${colors.yellow}origin/main..HEAD${colors.reset}
  ${colors.green}mergelog${colors.reset} ${colors.yellow}3 --no-code${colors.reset}
  ${colors.green}mergelog${colors.reset} ${colors.yellow}3 --clipboard${colors.reset}
  ${colors.green}mergelog${colors.reset} ${colors.yellow}--file input.txt${colors.reset}

${colors.bold}Options${colors.reset}
  ${colors.yellow}-h, --help${colors.reset}       Show this help screen
  ${colors.yellow}-C, --no-code${colors.reset}    Disable automatic backticks
  ${colors.yellow}-c, --clipboard${colors.reset}  Copy Markdown to the clipboard
  ${colors.yellow}-f, --file${colors.reset}       Read raw git log output or a test fixture from a file

${colors.bold}Defaults${colors.reset}
  No range:        detected upstream/default branch .. HEAD
  Number argument: last N commits, e.g. ${colors.yellow}3${colors.reset} -> ${colors.yellow}-3${colors.reset}

${colors.bold}Output${colors.reset}
  ### Commit subject

  Commit body

  Close #1234
`)
}
