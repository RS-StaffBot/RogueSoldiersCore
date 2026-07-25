module.exports = [
    {
        ignores: [
            "node_modules/**",
            "logs/**",
            "coverage/**"
        ]
    },
    {
        files: [
            "**/*.js"
        ],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",
            globals: {
                Buffer: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                clearImmediate: "readonly",
                clearInterval: "readonly",
                clearTimeout: "readonly",
                console: "readonly",
                exports: "writable",
                global: "readonly",
                module: "readonly",
                process: "readonly",
                queueMicrotask: "readonly",
                require: "readonly",
                setImmediate: "readonly",
                setInterval: "readonly",
                setTimeout: "readonly"
            }
        },
        linterOptions: {
            reportUnusedDisableDirectives: "error"
        },
        rules: {
            "array-bracket-spacing": [
                "error",
                "never"
            ],
            "comma-dangle": [
                "error",
                "never"
            ],
            "comma-spacing": [
                "error",
                {
                    before: false,
                    after: true
                }
            ],
            "curly": [
                "error",
                "all"
            ],
            "eqeqeq": [
                "error",
                "always"
            ],
            "indent": [
                "error",
                4,
                {
                    SwitchCase: 1
                }
            ],
            "keyword-spacing": [
                "error",
                {
                    before: true,
                    after: true
                }
            ],
            "no-console": "error",
            "no-constant-condition": "error",
            "no-duplicate-imports": "error",
            "no-extra-semi": "error",
            "no-irregular-whitespace": "error",
            "no-multiple-empty-lines": [
                "error",
                {
                    max: 1,
                    maxEOF: 0
                }
            ],
            "no-shadow": "error",
            "no-trailing-spaces": "error",
            "no-undef": "error",
            "no-unreachable": "error",
            "no-unused-vars": [
                "error",
                {
                    args: "after-used",
                    caughtErrors: "none",
                    vars: "all"
                }
            ],
            "object-curly-spacing": [
                "error",
                "always"
            ],
            "quotes": [
                "error",
                "double",
                {
                    avoidEscape: true
                }
            ],
            "semi": [
                "error",
                "always"
            ],
            "space-before-blocks": "error",
            "space-in-parens": [
                "error",
                "never"
            ]
        }
    },
    {
        files: [
            "src/app/Application.js",
            "src/core/Logger.js"
        ],
        rules: {
            "no-console": "off"
        }
    }
];