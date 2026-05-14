module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.js'],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(miniprogram-simulate)/)'
  ],
  moduleFileExtensions: ['js', 'json'],
  collectCoverageFrom: [
    'miniprogram/**/*.js',
    '!miniprogram/app.js',
    '!miniprogram/**/app.json'
  ]
}
