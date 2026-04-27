const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ── Firebase Auth: force browser bundle ────────────────────────────
//
// Problem:
//   @firebase/auth/dist/rn/index.js requires the AsyncStorage TurboModule
//   synchronously during module evaluation. In New Architecture Expo Go the
//   TurboModule is not yet initialised at that point, so the entire module
//   fails to evaluate, the "auth" component is never registered, and every
//   subsequent Firebase Auth call throws "Component auth has not been
//   registered yet".
//
// Fix:
//   Redirect firebase/auth → @firebase/auth/dist/esm2017/index.js (the
//   browser/ESM bundle). It has NO native-module dependencies, evaluates
//   cleanly, and exposes the full public Auth API (initializeAuth,
//   onAuthStateChanged, signIn*, GoogleAuthProvider, signOut, …).
//
//   Trade-off: sessions use inMemoryPersistence in Expo Go (no cross-restart
//   persistence). A proper dev/production build uses the RN bundle normally.
//
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'firebase/auth' || moduleName === '@firebase/auth') {
    return {
      filePath: path.resolve(
        __dirname,
        'node_modules/@firebase/auth/dist/esm/index.js',
      ),
      type: 'sourceFile',
    };
  }
  // react-native-worklets ships src/index but only lib/module/index actually exists
  if (moduleName === 'react-native-worklets') {
    return {
      filePath: path.resolve(
        __dirname,
        'node_modules/react-native-worklets/lib/module/index.js',
      ),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
