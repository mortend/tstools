#!/usr/bin/env tsx

import { execFileSync } from "node:child_process"

const [workspace, version] = process.argv.slice(2)

if (!workspace || !version) {
    console.error("Usage: npm run release -- <workspace> <version>")
    process.exit(1)
}

function run(command: string, args: string[]) {
    console.log(`$ ${command} ${args.join(" ")}`)
    execFileSync(command, args, { stdio: "inherit" })
}

run("npm", ["version", version, "--workspace", workspace, "--no-git-tag-version"])
run("git", ["add", `${workspace}/package.json`, "package-lock.json"])
run("git", ["commit", "-m", `${workspace}: ${version}`])
run("git", ["tag", `${workspace}@${version}`])
