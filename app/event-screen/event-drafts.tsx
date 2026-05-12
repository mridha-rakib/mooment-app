import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import BackButton from '@/components/ui/BackButton';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';

const DRAFT_EVENTS = [
  {
    id: '1',
    title: 'Rooftop Session Vol.4',
    description: 'Description of the event in one ....',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop',
  },
  {
    id: '2',
    title: 'Rooftop Session Vol.4',
    description: 'Description of the event in one ....',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop',
  },
  {
    id: '3',
    title: 'Rooftop Session Vol.4',
    description: 'Description of the event in one ....',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop',
  },
  {
    id: '4',
    title: 'Rooftop Session Vol.4',
    description: 'Description of the event in one ....',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop',
  },
  {
    id: '5',
    title: 'Rooftop Session Vol.4',
    description: 'Description of the event in one ....',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop',
  },
];

const DraftCard = ({ event, colors, onPress }: { event: any; colors: any; onPress: () => void }) => (
  <TouchableOpacity 
    style={[styles.card, { backgroundColor: '#1A1A1A' }]} 
    activeOpacity={0.7}
    onPress={onPress}
  >
    <Image source={{ uri: event.image }} style={styles.cardImage} contentFit="cover" />
    <View style={styles.cardContent}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{event.title}</Text>
      <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
        {event.description}
      </Text>
    </View>
    <View style={styles.arrowContainer}>
      <HugeiconsIcon icon={ArrowRight01Icon} size={20} color={colors.textSecondary} />
    </View>
  </TouchableOpacity>
);

export default function EventDraftsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <View style={styles.header}>
        <BackButton color={colors.text} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Event Drafts</Text>
        <View style={{ width: 40 }} /> {/* Spacer to center the title */}
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {DRAFT_EVENTS.map((event) => (
          <DraftCard 
            key={event.id} 
            event={event} 
            colors={colors} 
            onPress={() => router.push('/event-screen/event')}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    overflow: 'hidden',
  },
  cardImage: {
    width: 80,
    height: 54,
    borderRadius: 8,
  },
  cardContent: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
  },
  arrowContainer: {
    paddingLeft: 8,
  },
});
