const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 添加 .tflite 文件扩展名支持
config.resolver.assetExts.push('tflite');

module.exports = config;

