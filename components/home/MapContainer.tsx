import React from 'react';
import { useRouter } from 'expo-router';
import MapScreen, { MapMarkerData } from '@/components/ui/MapScreen';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const HOME_MAP_MARKERS: MapMarkerData[] = [
  { 
    id: 'h1', 
    latitude: 40.73061,
    longitude: -73.935242,
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150&auto=format&fit=crop",
    label: "Rooftop\nSession\nVol4.",
    glowColor: '#8E54E9'
  },
  { 
    id: 'h2', 
    latitude: 40.748817,
    longitude: -73.985428,
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150&auto=format&fit=crop",
    label: "Rooftop\nSession\nVol4.",
    glowColor: '#16a34a'
  },
  { 
    id: 'h3', 
    latitude: 40.712776,
    longitude: -74.005974,
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150&auto=format&fit=crop",
    label: "Rooftop\nSession\nVol4.",
    glowColor: '#8E54E9'
  },
  { 
    id: 'h4', 
    latitude: 40.706086,
    longitude: -73.996864,
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
