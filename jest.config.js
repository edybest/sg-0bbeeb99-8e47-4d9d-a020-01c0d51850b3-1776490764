module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/tests/jest.setup.ts"],
  collectCoverageFrom: [
    "src/services/**/*.ts",
    "!src/services/**/*.d.ts",
  ],
  coverageDirectory: "coverage",
  verbose: true,
  testTimeout: 30000, // 30 seconds for database operations
};