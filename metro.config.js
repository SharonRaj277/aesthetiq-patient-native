const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {

  // Fix firebase auth in Expo Go new architecture
  if (moduleName === 'firebase/auth' || moduleName === '@firebase/auth') {
    return {
      filePath: path.resolve(
        __dirname,
        'node_modules/@firebase/auth/dist/esm2017/index.js',
      ),
      type: 'sourceFile',
    };
  }

  // Fix react-native-worklets resolution
  if (moduleName === 'react-native-worklets') {
    return {
      filePath: path.resolve(
        __dirname,
        'node_modules/react-native-worklets/lib/module/index.js',
      ),
      type: 'sourceFile',
    };
  }

  // Default resolution for everything else including firebase/auth
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
