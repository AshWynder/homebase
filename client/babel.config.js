module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            [
                'babel-preset-expo',
                {jsxImportSource: 'nativewind'} // <-- Must be inside an array with babel-preset-expo
            ],
            'nativewind/babel',
        ],
        plugins: ['react-native-reanimated/plugin']
    };
};