module.exports = {
  "verbose": true,
  "transform": {
    ".(ts|tsx)": "<rootDir>/../../node_modules/ts-jest/preprocessor.js"
  },
  "testMatch": [
    "**/tests/**/*.test.ts?(x)"
  ],
  "coverageDirectory": "dist/coverage",
  "collectCoverageFrom": [
    "src/**/*.{ts,tsx,js,jsx}"
  ],
  "coveragePathIgnorePatterns": [".*\\.d\\.ts", "<rootDir>/node_modules/"],
  "mapCoverage": true,
  "moduleFileExtensions": [
    "ts",
    "tsx",
    "js",
    "json"
  ],
  "globals": {
    "ts-jest": {
      "skipBabel": true,
      "tsConfigFile": "./config/tsconfig-test.json"
    }
  },
  "testEnvironment": "node"
};
