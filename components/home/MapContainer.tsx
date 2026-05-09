import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

const { width, height } = Dimensions.get('window');

// Custom Marker Component
const MapMarker = ({ 
  top, 
  left, 
  right, 
  image, 
  label, 
  glowColor = '#D4B0EB',
  isCluster = false,
  isGMarker = false,
  clusterCount = 0
}: {
  top?: number;
  left?: number;
  right?: number;
  image?: string;
  label?: string;
  glowColor?: string;
  isCluster?: boolean;
  isGMarker?: boolean;
  clusterCount?: number;
}) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.markerContainer, { top, left, right }]}>
      <View style={styles.markerContent}>
        {isCluster ? (
          <View style={[styles.clusterMarker, { backgroundColor: 'rgba(142, 142, 155, 0.8)', borderColor: colors.border }]}>
            <Text style={styles.clusterText}>{clusterCount}</Text>
          </View>
        ) : isGMarker ? (
          <View style={styles.gMarker}>
            <Text style={styles.gMarkerText}>G</Text>
          </View>
        ) : (
          <>
            <View style={[styles.imageWrapper, { shadowColor: glowColor, backgroundColor: colors.background }]}>
              <Image source={{ uri: image }} style={styles.markerImage} />
              <LinearGradient
                colors={['transparent', glowColor]}
                style={styles.markerBorder}
              />
            </View>
            {label && (
              <View style={styles.labelContainer}>
                <Text style={[styles.labelText, { color: '#FFFFFF' }]}>{label}</Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
};

export default function MapContainer() {
  const { colors, isDark } = useTheme();
  const MAP_BG = require('../../assets/images/Basemap image.png');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Map Background */}
      <Image 
        source={MAP_BG} 
        style={[styles.mapImage, { opacity: isDark ? 0.7 : 1 }]}
        resizeMode="cover"
      />

      {/* Markers */}
      <MapMarker 
        top={height * 0.12} 
        left={width * 0.15} 
        image="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150&auto=format&fit=crop"
        label="Rooftop\nSession\nVol4."
      />

      <MapMarker 
        top={height * 0.18} 
        right={width * 0.25} 
        image="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150&auto=format&fit=crop"
        label="Rooftop\nSession\nVol4."
      />

      <MapMarker 
        top={height * 0.15} 
        right={width * 0.05} 
        isGMarker
      />

      <MapMarker 
        top={height * 0.28} 
        right={width * 0.15} 
        isCluster
        clusterCount={4}
      />

      {/* Current Location Blue Dot */}
      <View style={[styles.markerContainer, { top: height * 0.4, left: width * 0.45 }]}>
        <View style={styles.currentLocationOuter}>
          <View style={styles.currentLocationInner} />
        </View>
      </View>

      <MapMarker 
        top={height * 0.38} 
        left={width * 0.08} 
        image="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150&auto=format&fit=crop"
        label="Rooftop\nSession\nVol4."
        glowColor="#FFFFFF"
      />

      <MapMarker 
        top={height * 0.42} 
        right={width * 0.1} 
        image="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150&auto=format&fit=crop"
        label="Rooftop\nSession\nVol4."
        glowColor="#FFFFFF"
      />

      <MapMarker 
        top={height * 0.58} 
        left={width * 0.08} 
        image="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150&auto=format&fit=crop"
        label="Rooftop\nSession\nVol4."
      />

      <MapMarker 
        top={height * 0.68} 
        left={width * 0.42} 
        image="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150&auto=format&fit=crop"
        label="Rooftop\nSession\nVol4."
      />

      {/* Bottom Controls */}
      <View style={styles.controlsContainer}>
        {/* Left Side: Zoom */}
        <View style={styles.leftControls}>
          <TouchableOpacity style={[styles.glassBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', borderColor: colors.border }]}>
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={styles.glassBtnInner}>
              <Feather name="plus" size={24} color={colors.text} />
            </BlurView>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.glassBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', borderColor: colors.border }]}>
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={styles.glassBtnInner}>
              <Feather name="minus" size={24} color={colors.text} />
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* Right Side: Layers and Location */}
        <View style={styles.rightControls}>
          <TouchableOpacity style={[styles.glassBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', borderColor: colors.border }]}>
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={styles.glassBtnInner}>
              <MaterialCommunityIcons name="satellite-variant" size={24} color={colors.text} />
            </BlurView>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.glassBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', borderColor: colors.border }]}>
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={styles.glassBtnInner}>
              <MaterialCommunityIcons name="crosshairs-gps" size={24} color={colors.text} />
            </BlurView>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapImage: {
    width: width,
    height: height,
    position: 'absolute',
  },
  markerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageWrapper: {
    width: 54,
    height: 54,
    borderRadius: 27,
    padding: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  markerBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: 'transparent',
    opacity: 0.5,
  },
  labelContainer: {
    marginLeft: 8,
    maxWidth: 100,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  clusterMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  clusterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  gMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8E54E9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8E54E9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  gMarkerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  currentLocationOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  currentLocationInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  leftControls: {
    gap: 12,
  },
  rightControls: {
    gap: 12,
  },
  glassBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  glassBtnInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
