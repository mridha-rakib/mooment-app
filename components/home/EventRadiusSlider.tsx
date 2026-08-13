import { useTheme } from '@/hooks/useTheme';
import {
  MAX_EVENT_RADIUS_MILES,
  MIN_EVENT_RADIUS_MILES,
  normalizeEventRadiusMiles,
} from '@/lib/eventFilters';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

export type EventRadiusSliderProps = {
  value: number;
  onChangeCommitted: (radiusMiles: number) => void;
};

// Drag state lives entirely inside this component so a thumb movement only
// re-renders this small subtree, not the whole FilterModal (date picker,
// hashtag input, location search, pills, footer, etc). The parent's radius
// state — used by Apply/Cancel/Reset — is only touched once, on release.
export default function EventRadiusSlider({ value, onChangeCommitted }: EventRadiusSliderProps) {
  const { colors, isDark } = useTheme();
  const [liveRadius, setLiveRadius] = useState(() => normalizeEventRadiusMiles(value));
  const [trackWidth, setTrackWidth] = useState(0);
  const liveRadiusRef = useRef(liveRadius);
  const trackWidthRef = useRef(trackWidth);

  useEffect(() => {
    const normalized = normalizeEventRadiusMiles(value);
    liveRadiusRef.current = normalized;
    setLiveRadius(normalized);
  }, [value]);

  useEffect(() => {
    trackWidthRef.current = trackWidth;
  }, [trackWidth]);

  const updateLiveRadius = useCallback((x: number) => {
    if (trackWidthRef.current <= 0) return;

    const percent = Math.max(0, Math.min(1, x / trackWidthRef.current));
    const nextRadius = MIN_EVENT_RADIUS_MILES +
      Math.round(percent * (MAX_EVENT_RADIUS_MILES - MIN_EVENT_RADIUS_MILES));
    const normalized = normalizeEventRadiusMiles(nextRadius);

    liveRadiusRef.current = normalized;
    setLiveRadius(normalized);
  }, []);

  const commitLiveRadius = useCallback(() => {
    onChangeCommitted(liveRadiusRef.current);
  }, [onChangeCommitted]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => updateLiveRadius(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => updateLiveRadius(evt.nativeEvent.locationX),
      onPanResponderRelease: () => commitLiveRadius(),
      onPanResponderTerminate: () => commitLiveRadius(),
    }),
  ).current;

  const percent = ((liveRadius - MIN_EVENT_RADIUS_MILES) / (MAX_EVENT_RADIUS_MILES - MIN_EVENT_RADIUS_MILES)) * 100;

  return (
    <View style={[styles.radiusContainer, { borderColor: colors.border }]}>
      <View style={styles.radiusHeader}>
        <Text style={[styles.inputText, { color: colors.text }]}>Radius</Text>
        <Text style={[styles.radiusValueText, { color: colors.primary }]}>{liveRadius} miles</Text>
      </View>
      <View
        style={[styles.sliderTrack, { backgroundColor: isDark ? '#3A3A44' : '#E0E0E0' }]}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={[styles.sliderFill, { width: `${percent}%`, backgroundColor: colors.primary }]} />
        <View style={[styles.sliderThumb, { left: `${percent}%`, backgroundColor: colors.text }]} />
      </View>
      <View style={styles.radiusLabels}>
        <Text style={[styles.radiusLabelText, { color: colors.textSecondary }]}>{MIN_EVENT_RADIUS_MILES}</Text>
        <Text style={[styles.radiusLabelText, { color: colors.textSecondary }]}>{MAX_EVENT_RADIUS_MILES} miles</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  radiusContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputText: {
    fontSize: 14,
    flex: 1,
  },
  radiusValueText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 2,
  },
  sliderThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    position: 'absolute',
    transform: [{ translateX: -7 }],
  },
  radiusLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  radiusLabelText: {
    fontSize: 10,
  },
});
