import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import {
  EVENT_WIZARD_STEPS,
  type EventWizardStepKey,
  type EventWizardStepState,
} from '@/lib/eventWizardSteps';

type CreateEventStepNavigatorProps = {
  stepStates: Record<EventWizardStepKey, EventWizardStepState>;
  onStepPress: (step: EventWizardStepKey) => void;
};

// EVT-002 — compact tappable step navigator. Replaces the previous static
// "Step N / N out of 5" text on the five main Create/Edit Event screens.
// Purely presentational: eligibility/validity/state-persistence logic lives
// in app/lib/eventWizardSteps.ts and each screen's own handler.
export default function CreateEventStepNavigator({ stepStates, onStepPress }: CreateEventStepNavigatorProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container} accessibilityRole="tablist">
      {EVENT_WIZARD_STEPS.map((step) => {
        const state = stepStates[step.key];
        const isCurrent = state === 'current';
        const isGuarded = state === 'guarded';

        return (
          <TouchableOpacity
            key={step.key}
            style={styles.item}
            activeOpacity={isGuarded ? 1 : 0.6}
            disabled={isGuarded}
            onPress={() => onStepPress(step.key)}
            accessibilityRole={isGuarded ? 'text' : 'tab'}
            accessibilityLabel={step.label}
            accessibilityState={{ selected: isCurrent, disabled: isGuarded }}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { color: isCurrent ? colors.text : colors.textSecondary },
                isCurrent ? styles.labelCurrent : null,
                isGuarded ? styles.labelGuarded : null,
              ]}
            >
              {step.label}
            </Text>
            <View
              style={[
                styles.indicator,
                { backgroundColor: isCurrent ? colors.primary : isGuarded ? 'transparent' : colors.border },
              ]}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    gap: 4,
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
  labelCurrent: {
    fontWeight: '700',
  },
  labelGuarded: {
    opacity: 0.55,
  },
  indicator: {
    marginTop: 6,
    height: 3,
    borderRadius: 2,
    width: '100%',
  },
});
