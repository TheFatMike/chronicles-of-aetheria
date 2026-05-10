/**
 * @file eslint.config.js
 * @description Configuration for the ESLint static analysis tool.
 * Defines coding standards, linting rules, and plugin configurations for the project.
 * @importance Essential: Maintains code quality, readability, and consistency across the entire codebase.
 */
import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*']
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
