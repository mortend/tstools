# mergelog

[![NPM package](https://img.shields.io/npm/v/mergelog.svg?style=flat-square)](https://www.npmjs.com/package/mergelog)
[![NPM downloads](https://img.shields.io/npm/dt/mergelog?style=flat-square)](https://www.npmjs.com/package/mergelog)
[![License: MIT](https://img.shields.io/github/license/mortend/tstools.svg?style=flat-square)](../LICENSE)

> Format git commits as Markdown for merge and pull request descriptions

## Why

- Generate clean Markdown directly from `git log`
- Optimized for GitLab and GitHub merge request descriptions
- Automatically formats code-like terms with backticks
- Detects issue references like `#1234`
- Detects the repository main branch automatically
- Supports clipboard output

## Install

```sh
npm install mergelog -g
```

## Usage

```sh
$ mergelog --help

mergelog

Format git commits as Markdown for merge/pull request descriptions.

Usage
  mergelog
  mergelog 3
  mergelog origin/main..HEAD
  mergelog 3 --no-code
  mergelog 3 --clipboard

Options
  -h, --help       Show this help screen
  -C, --no-code    Disable automatic backticks
  -c, --clipboard  Copy Markdown to the clipboard

Defaults
  No range:        detected upstream/default branch .. HEAD
  Number argument: last N commits, e.g. 3 -> -3

Output
  ### Commit subject

  Commit body

  Close #1234
```

## Example output

```md
### Tools: Improve startup logging

Show clearer restart and shutdown messages during local development.

### API: Deprecate timezone fields

Mark legacy timezone fields as deprecated in the API schema.

Close #1234

### Calendar: Fix week rendering for January 2027

Render calendar weeks using actual dates instead of ISO week numbers.
```
