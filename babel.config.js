module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Expo Router transforms and file-based routing support
      require.resolve('expo-router/babel'),
      // Optional: improves tree-shaking for react-native-paper
      'react-native-paper/babel',
      // Must be last per Reanimated docs
      'react-native-reanimated/plugin',
    ],
  };
};

