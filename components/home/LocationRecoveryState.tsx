import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { DeviceLocationFailureStatus } from '@/lib/locationSharing';

// Minimal, existing-style recovery affordance shown when the device location
// needed for the "Current Location" Event discovery center is unavailable. It is
// deliberately NOT a full-screen redesign: a compact message + two actions
// ("Open Settings", "Retry"). It never mutates any location/filter/global
// sharing state itself — the parent owns Retry.
export type LocationRecoveryStatus = DeviceLocationFailureStatus;

const SUBTEXT: Record<LocationRecoveryStatus, string> = {
  permissionDenied: 'Location permission is off for this app.',
  permissionBlocked: 'Enable location for this app in Settings.',
  servicesDisabled: 'Location Services are turned off on this device.',
  unavailable: 'Location is not available right now.',
  failed: "We couldn't read your location.",
  timeout: "We couldn't read your location in time.",
};

type LocationRecoveryStateProps = {
  status: LocationRecoveryStatus;
  onRetry: () => void;
  retrying?: boolean;
  variant?: 'panel' | 'banner';
  onOpenSettings?: () => void;
};

export default function LocationRecoveryState({
  status,
  onRetry,
  retrying = false,
  variant = 'panel',
  onOpenSettings,
}: LocationRecoveryStateProps) {
  const { colors, isDark } = useTheme();

  const handleOpenSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
      return;
    }
    void Linking.openSettings().catch(() => undefined);
  };

  return (
    <View
      style={[
        styles.container,
        variant === 'banner' ? styles.banner : styles.panel,
        {
          backgroundColor: isDark ? '#2A2A32' : '#F0F0F3',
          borderColor: colors.border,
        },
      ]}
      accessibilityRole="alert"
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Turn on location to see events near you
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{SUBTEXT[status]}</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, { borderColor: colors.border }]}
          activeOpacity={0.75}
          onPress={handleOpenSettings}
          accessibilityRole="button"
          accessibilityLabel="Open Settings"
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>Open Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { borderColor: colors.border }]}
          activeOpacity={0.75}
          onPress={onRetry}
          disabled={retrying}
          accessibilityRole="button"
          accessibilityLabel="Retry"
          accessibilityState={{ disabled: retrying }}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>
            {retrying ? 'Retrying…' : 'Retry'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
  },
  panel: {
    padding: 16,
    marginTop: 12,
  },
  banner: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  button: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
