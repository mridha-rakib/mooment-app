module.exports = {
  dependencies: {
    'react-native-compressor': {
      platforms: {
        android: {
          packageImportPath:
            'import com.reactnativecompressor.NitroCompressorPackage;',
          packageInstance: 'new NitroCompressorPackage()',
        },
      },
    },
  },
};
