import React from 'react';
import { useRouter } from 'expo-router';
import MapScreen, { MapMarkerData } from '@/components/ui/MapScreen';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const HOME_MAP_MARKERS: MapMarkerData[] = [
  { 
    id: 'h1', 
    top: height * 0.22, 
    left: width * 0.15, 
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150&auto=format&fit=crop",
    label: "Rooftop\nSession\nVol4.",
    glowColor: '#8E54E9'
  },
  { 
    id: 'h2', 
    top: height * 0.32, 
    right: width * 0.2, 
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150&auto=format&fit=crop",
    label: "Rooftop\nSession\nVol4.",
    glowColor: '#16a34a'
  },
  { 
    id: 'h3', 
    top: height * 0.48, 
    left: width * 0.15, 
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150&auto=format&fit=crop",
    label: "Rooftop\nSession\nVol4.",
    glowColor: '#8E54E9'
  },
  { 
    id: 'h4', 
    top: height * 0.52, 
    right: width * 0.1, 
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150&auto=format&fit=crop",
    label: "Rooftop\nSession\nVol4.",
    glowColor: '#D44343'
  }
];

export default function MapContainer({ onBack }: { onBack?: () => void }) {
  const router = useRouter();

  return (
    <MapScreen 
      markers={HOME_MAP_MARKERS} 
      logoText="Mooment"
      onBack={onBack}
    />
  );
}
