import {
  ChevronRight,
  PencilEdit01Icon,
  QrCodeIcon,
  Ticket02Icon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/hooks/useTheme';
import { getMyProfileEvents } from '@/lib/events';

interface AddOptionsModalProps {
  visible: boolean;
  onClose: () => void;
}

const OPTIONS = [
  {
    id: 'moment',
    label: 'Mooment',
    description: 'Share one to your followers in just about on event you\'re attending',
    icon: PencilEdit01Icon,
    color: '#54268F',
    bg: '#AFA9EC',
    route: '/post-screen/create-post',
  },
  {
    id: 'event',
    label: 'Create Event',
    description: 'Post a real-world experience',
    icon: Ticket02Icon,
    color: '#631C1C',
    bg: '#DE7777',
    route: '/create-event',
  },
  {
    id: 'scan',
    label: 'Scan QR',

    description: 'Scan to open on product links',
    icon: QrCodeIcon,
    color: '#0C447C',
    bg: '#85B7EB',
    route: '/event-screen/scan-qr',
  },
];

export default function AddOptionsModal({ visible, onClose }: AddOptionsModalProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [canScanQr, setCanScanQr] = React.useState(false);
  const visibleOptions = React.useMemo(
    () => OPTIONS.filter((option) => option.id !== 'scan' || canScanQr),
    [canScanQr],
  );

  React.useEffect(() => {
    if (!visible) {
      return;
    }

    let isMounted = true;
    setCanScanQr(false);

    const loadEventAccess = async () => {
      try {
        const profileEvents = await getMyProfileEvents();

        if (isMounted) {
          setCanScanQr(profileEvents.active.length > 0);
        }
      } catch {
        if (isMounted) {
          setCanScanQr(false);
        }
      }
    };

    void loadEventAccess();

    return () => {
      isMounted = false;
    };
  }, [visible]);

  const handleOption = (route: string) => {
    onClose();
    router.push(route as any);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={[styles.overlay, { backgroundColor: isDark ? '#000000CC' : 'rgba(0,0,0,0.4)' }]} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <BlurView intensity={60} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        
        <TouchableOpacity activeOpacity={1} style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.handle, { backgroundColor: colors.text }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Select to proceed</Text>

          <View style={styles.optionsList}>
            {visibleOptions.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.optionRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleOption(opt.route)}
                activeOpacity={0.75}
              >
                <View style={[styles.optionIcon, { backgroundColor: opt.bg }]}>
                  <HugeiconsIcon icon={opt.icon} size={22} color={opt.color} strokeWidth={1.5} />
                </View>

                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>{opt.label}</Text>
                  <Text style={[styles.optionDesc, { color: colors.textSecondary }]} numberOfLines={2}>{opt.description}</Text>
                </View>

                <HugeiconsIcon icon={ChevronRight} size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    borderWidth: 1,
  },
  handle: {
    width: 60,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 24,
    textAlign: 'center',
  },
  optionsList: {
    gap: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 20,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionText: {
    flex: 1,
    paddingRight: 8,
  },
  optionLabel: {
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 3,
  },
  optionDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
});
