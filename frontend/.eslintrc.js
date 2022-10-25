module.exports = {
  settings: {
    react: {
      version: "detect", // React version. "detect" automatically picks the version you have installed.
    },
  },

  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
  ],
  overrides: [],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["react", "@typescript-eslint"],
  rules: {
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-namespace": "off",
    "@typescript-eslint/no-empty-interface": "off",
    "no-empty-pattern": "off",
    "no-inner-declarations": "off",
    "no-unused-vars": "off",
    "react/prop-types": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: ".*",
      },
    ],
  },
};
