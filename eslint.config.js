const eslint = require("@eslint/js")
const tseslint = require("typescript-eslint")
const globals = require("globals")

module.exports = tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ignores: ["**/dist/**", "node_modules/**"],
    },
    {
        files: ["**/*.ts"],
        languageOptions: {
            globals: globals.node,
        },
        rules: {
            "no-console": "off",
            "no-control-regex": "off",
            "no-empty": ["error", { allowEmptyCatch: true }],
        },
    },
    {
        files: ["eslint.config.js"],
        languageOptions: {
            globals: globals.node,
        },
        rules: {
            "@typescript-eslint/no-require-imports": "off",
        },
    },
)
