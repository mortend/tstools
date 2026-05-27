# branchclean

> Clean up local git branches that become identical to the main branch after rebasing

## Why

- Automatically cleans up rebased branches that no longer differ from main
- Detects the repository main branch automatically
- Rebases branches before checking for deletion
- Skips the current branch and the detected main branch
- Supports dry-run mode

## Install

```sh
npm install branchclean -g
```

## Usage

```sh
$ npx branchclean --help

branchclean

Clean up local git branches that become identical to the main branch after rebasing.

Usage
  branchclean
  branchclean --dry-run
  branchclean --no-fetch

Options
  -h, --help     Show this help screen
  -n, --dry-run  Show branches that would be deleted
  --no-fetch     Skip fetching origin before scanning

Behavior
  * Detects the main branch from origin/HEAD
  * Falls back to origin/main, origin/master, main, then master
  * Rebases each local branch onto the detected main branch
  * Deletes branches that match the detected main branch after rebase
  * Skips the current branch and the detected main branch
```

## Example

```sh
$ npx branchclean --dry-run

Fetching origin...

Processing branch: feature/login-cleanup
feature/login-cleanup matches origin/main. Would delete.

Processing branch: feature/new-api
feature/new-api still differs from origin/main. Keeping it.

Done.
```
