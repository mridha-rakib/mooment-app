import { useTheme } from '@/hooks/useTheme';
import {
  MAX_EVENT_RADIUS_MILES,
  MIN_EVENT_RADIUS_MILES,
  crossesMajorRadiusCheckpoint,
  formatEventRadiusLabel,
  normalizeEventRadiusMiles,
} from '@/lib/eventFilters';
import { tapFeedback } from '@/lib/microFeedback';
import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type EventRadiusSliderProps = {
  value: number;
  // Distance filter active/inactive. When false the readout shows "Any distance"
  // and the track/thumb are shown muted; the first drag gesture calls onActivate.
  enabled: boolean;
  onActivate: () => void;
  // Optional radius-only clear (shown as a small × when enabled).
  onClear?: () => void;
  onChangeCommitted: (radiusMiles: number) => void;
};

// Drag state lives entirely inside this component so a thumb movement only
// re-renders this small subtree, not the whole FilterModal (date picker,
// hashtag input, location search, pills, footer, etc). The parent's radius
// state — used by Apply/Cancel/Reset — is only touched once, on release.
export default function EventRadiusSlider({
  value,
  enabled,
  onActivate,
  onClear,
  onChangeCommitted,
}: EventRadiusSliderProps) {
  const { colors, isDark } = useTheme();
  const [liveRadius, setLiveRadius] = useState(() => normalizeEventRadiusMiles(value));
  const [trackWidth, setTrackWidth] = useState(0);
  const liveRadiusRef = useRef(liveRadius);
  const trackWidthRef = useRef(trackWidth);
  // The PanResponder is created once, so the grant handler reads these via refs.
  const enabledRef = useRef(enabled);
  const onActivateRef = useRef(onActivate);

  useEffect(() => {
    const normalized = normalizeEventRadiusMiles(value);
    liveRadiusRef.current = normalized;
    setLiveRadius(normalized);
  }, [value]);

  useEffect(() => {
    trackWidthRef.current = trackWidth;
  }, [trackWidth]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    onActivateRef.current = onActivate;
  }, [onActivate]);

  const updateLiveRadius = useCallback((x: number) => {
    if (trackWidthRef.current <= 0) return;

    const percent = Math.max(0, Math.min(1, x / trackWidthRef.current));
    const nextRadius = MIN_EVENT_RADIUS_MILES +
      Math.round(percent * (MAX_EVENT_RADIUS_MILES - MIN_EVENT_RADIUS_MILES));
    const normalized = normalizeEventRadiusMiles(nextRadius);

    if (normalized !== liveRadiusRef.current) {
      // At most one light tick per update, only when the drag crosses a major
      // checkpoint (5/10/25/50/75/100/150/200), in either direction. Purely
      // local + fire-and-forget — no state, no network, never awaited. Simply
      // activating at the anchor (no value change) hits the guard above → no tick.
      if (crossesMajorRadiusCheckpoint(liveRadiusRef.current, normalized)) {
        tapFeedback();
      }
      liveRadiusRef.current = normalized;
      setLiveRadius(normalized);
    }
  }, []);

  const commitLiveRadius = useCallback(() => {
    onChangeCommitted(liveRadiusRef.current);
  }, [onChangeCommitted]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // The first intentional touch turns the distance filter on; the same
        // gesture then continues normally (no extra tap / confirmation).
        if (!enabledRef.current) {
          onActivateRef.current();
        }
        updateLiveRadius(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => updateLiveRadius(evt.nativeEvent.locationX),
      onPanResponderRelease: () => commitLiveRadius(),
      onPanResponderTerminate: () => commitLiveRadius(),
    }),
  ).current;

  const percent = ((liveRadius - MIN_EVENT_RADIUS_MILES) / (MAX_EVENT_RADIUS_MILES - MIN_EVENT_RADIUS_MILES)) * 100;
  const activeColor = enabled ? colors.primary : colors.textSecondary;
  const thumbColor = enabled ? colors.text : colors.textSecondary;

  return (
    <View style={[styles.radiusContainer, { borderColor: colors.border }]}>
      <View style={styles.radiusHeader}>
        <Text style={[styles.inputText, { color: colors.text }]}>Radius</Text>
        <View style={styles.radiusValueGroup}>
          <Text style={[styles.radiusValueText, { color: activeColor }]}>
            {enabled ? formatEventRadiusLabel(liveRadius) : 'Any distance'}
          </Text>
          {enabled && onClear ? (
            <TouchableOpacity
              onPress={onClear}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Clear distance filter"
            >
              <Feather name="x" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <View
        style={[styles.sliderTrack, { backgroundColor: isDark ? '#3A3A44' : '#E0E0E0' }]}
        // Visually unchanged 4px track; the touch/drag target is expanded so
        // the thumb is easy to grab on low/mid-range devices without altering
        // the track/thumb geometry or the value mapping.
        hitSlop={{ top: 20, bottom: 20, left: 12, right: 12 }}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={[styles.sliderFill, { width: `${percent}%`, backgroundColor: activeColor }]} />
        <View style={[styles.sliderThumb, { left: `${percent}%`, backgroundColor: thumbColor }]} />
      </View>
      <View style={styles.radiusLabels}>
        <Text style={[styles.radiusLabelText, { color: colors.textSecondary }]}>{MIN_EVENT_RADIUS_MILES}</Text>
        <Text style={[styles.radiusLabelText, { color: colors.textSecondary }]}>{MAX_EVENT_RADIUS_MILES}+ miles</Text>
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
  radiusValueGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
