const path = require('path'),
 CopyWebpackPlugin = require('copy-webpack-plugin'),
 HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    background: './src/background/background.js',
    popup: './src/popup/popup.js',
  },
  mode: 'development',
  devtool: "cheap-module-source-map",
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src", "popup", "popup.html"),
      filename: "popup.html",
      chunks: ["firebase_config"]
    }),
    new CopyWebpackPlugin({
        patterns: [{ from: path.join(__dirname, "src", "public") }]
    }),
  ],
};