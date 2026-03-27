module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@react-native|react-native|react-native-vector-icons|react-native-svg|expo|expo-asset|expo-file-system|expo-constants|@expo|(jest-)?react-native)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
};
