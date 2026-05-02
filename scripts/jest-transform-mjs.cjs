const babelJest = require('babel-jest').default;

module.exports = babelJest.createTransformer({
  babelrc: false,
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs'],
});
