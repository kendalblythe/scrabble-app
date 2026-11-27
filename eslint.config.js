import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

const recommendedReactHooks = reactHooks.configs.flat.recommended;

export default [
  {
    ...recommendedReactHooks,
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ...recommendedReactHooks.languageOptions,
      parser: tsParser,
    },
    rules: {
      ...recommendedReactHooks.rules,
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/rules-of-hooks': 'off',
    },
  },
];
