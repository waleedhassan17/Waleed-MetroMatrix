const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add web shims for native-only modules so web bundling doesn't crash
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    // Redirect react-native-maps to web shim
    if (moduleName === 'react-native-maps') {
      return {
        filePath: path.resolve(__dirname, 'react-native-maps.web.js'),
        type: 'sourceFile',
      };
    }
    // Redirect react-native-maps-directions to web shim
    if (moduleName === 'react-native-maps-directions') {
      return {
        filePath: path.resolve(__dirname, 'react-native-maps-directions.web.js'),
        type: 'sourceFile',
      };
    }
  }
  // Fall back to default resolution for everything else
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
