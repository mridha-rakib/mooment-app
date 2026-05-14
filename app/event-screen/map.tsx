import React from 'react';
import { useRouter } from 'expo-router';
import MapScreen, { MapMarkerData } from '@/components/ui/MapScreen';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const MOCK_EVENT_MARKERS: MapMarkerData[] = [
  { 
    id: '1', 
    latitude: 40.73061,
    longitude: -73.935242,
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150&auto=format&fit=crop",
    label: "Rooftop\nSession\nVol4.",
    glowColor: '#8E54E9'
  },
  { 
    id: '2', 
    latitude: 40.748817,
    longitude: -73.985428,
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=150&auto=format&fit=crop",
    label: "Night Out\nVol 2",
    glowColor: '#FFFFFF'
  },
  { 
    id: '3', 
    latitude: 40.712776,
    longitude: -74.005974,
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=150&auto=format&fit=crop",
    label: "Summer\nParty",
    glowColor: '#8E54E9'
  },
  { 
    id: '4', 
    latitude: 40.706086,
    longitude: -73.996864,
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=150&auto=format&fit=crop",
    label: "Glow Night",
    glowColor: '#D44343'
  }
];

export default function EventMapScreen() {
  const router = useRouter();

  return (
    <MapScreen 
      markers={MOCK_EVENT_MARKERS} 
      onBack={() => router.back()} 
      logoText="Event Map"
    />
  );
}
