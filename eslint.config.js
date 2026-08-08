import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
    {
        ignores: ['dist/**']
    },
    eslint.configs.recommended,
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            }
        },
        plugins: {
            '@typescript-eslint': tseslint
        },
        rules: {
            ...tseslint.configs['eslint-recommended'].overrides[0].rules,
            ...tseslint.configs.recommended.rules,
            quotes: ['warn', 'single'],
            indent: ['warn', 4, { SwitchCase: 1 }],
            semi: ['off'],
            'comma-dangle': ['warn', 'never'],
            'dot-notation': 'off',
            eqeqeq: 'warn',
            curly: ['warn', 'multi-line'],
            'brace-style': ['warn'],
            'prefer-arrow-callback': ['warn'],
            'max-len': ['warn', 140],
            'no-console': ['warn'],
            'comma-spacing': ['error'],
            'no-multi-spaces': ['warn', { ignoreEOLComments: true }],
            'no-trailing-spaces': ['warn'],
            'lines-between-class-members': ['warn', 'always', { exceptAfterSingleLine: true }],
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off'
        }
    }
];