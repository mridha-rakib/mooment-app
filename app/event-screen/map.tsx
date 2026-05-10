import React from 'react';
import { useRouter } from 'expo-router';
import MapScreen, { MapMarkerData } from '@/components/ui/MapScreen';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const MOCK_EVENT_MARKERS: MapMarkerData[] = [
  { 
    id: '1', 
    top: height * 0.22, 
    left: width * 0.15, 
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150&auto=format&fit=crop",
    label: "Rooftop\nSession\nVol4.",
    glowColor: '#8E54E9'
  },
  { 
    id: '2', 
    top: height * 0.32, 
    right: width * 0.2, 
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=150&auto=format&fit=crop",
    label: "Night Out\nVol 2",
    glowColor: '#FFFFFF'
  },
  { 
    id: '3', 
    top: height * 0.48, 
    left: width * 0.15, 
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=150&auto=format&fit=crop",
    label: "Summer\nParty",
    glowColor: '#8E54E9'
  },
  { 
    id: '4', 
    top: height * 0.52, 
    right: width * 0.1, 
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
