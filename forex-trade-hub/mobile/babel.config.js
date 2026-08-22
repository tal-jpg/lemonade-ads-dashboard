module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated 4 compiles its worklets here. This plugin MUST be listed
      // last — anything after it will not be transformed.
      'react-native-worklets/plugin',
    ],
  };
};
