import React from 'react';
import { useRouter } from 'expo-router';
import MapContainer from '@/components/home/MapContainer';

export default function EventMapScreen() {
  const router = useRouter();

  return (
    <MapContainer
      onBack={() => router.back()}
      logoText="Event Map"
    />
  );
}
