import React from 'react';
import { StyleSheet, View, Image, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function MapContainer() {
  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/images/map_bg.png')} 
        style={styles.mapImage}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mapImage: {
    width: width,
    height: height * 0.7, // Adjust based on layout
  },
});
