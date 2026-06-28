import { Feather } from "@expo/vector-icons";
import BackButton from "@/components/ui/BackButton";
import { Spinner } from "@/components/ui/spinner";
import { useTheme } from "@/hooks/useTheme";
import { getMyPayouts } from "@/lib/payoutSettings";
import type { CreatorPayout, CreatorPayoutStatus } from "@/lib/payoutSettings";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STATUS_CONFIG: Record<
  CreatorPayoutStatus,
  { label: string; icon: string; colorKey: "success" | "warning" | "danger" | "textSecondary" | "primary" }
> = {
  completed: { label: "Completed", icon: "check-circle", colorKey: "success" },
  processing: { label: "Processing", icon: "loader", colorKey: "primary" },
  pending: { label: "Pending", icon: "clock", colorKey: "warning" },
  failed: { label: "Failed", icon: "x-circle", colorKey: "danger" },
  cancelled: { label: "Cancelled", icon: "slash", colorKey: "textSecondary" },
};

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  instant_debit_card: "Debit Card · Instant",
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatAmount = (amount: number, currency = "usd"): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount);
};

const truncateId = (id: string | null | undefined): string => {
  if (!id) return "–";
  return id.length > 20 ? `${id.slice(0, 10)}…${id.slice(-6)}` : id;
};

function DateRow({ label, value, colorKey, colors }: { label: string; value: string; colorKey?: string; colors: any }) {
  const color = colorKey ? (colors[colorKey] ?? colors.text) : colors.text;
  return (
    <View style={styles.dateItem}>
      <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.dateValue, { color }]}>{value}</Text>
    </View>
  );
}

function InfoRow({ label, value, mono, colors }: { label: string; value: string; mono?: boolean; colors: any }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text, fontFamily: mono ? "monospace" : undefined }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function PayoutCard({ payout, colors }: { payout: CreatorPayout; colors: any }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[payout.status] ?? STATUS_CONFIG.pending;
  const statusColor = colors[statusCfg.colorKey];
  const hasDetails =
    !!payout.processingStartedAt ||
    !!payout.stripeTransferId ||
    payout.status === "completed" ||
    payout.status === "failed";

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.amountRow}>
          <Text style={[styles.amount, { color: colors.text }]}>
            {formatAmount(payout.totalAmount, payout.currency)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Feather name={statusCfg.icon as any} size={11} color={statusColor} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>{statusCfg.label}</Text>
          </View>
        </View>
        <Text style={[styles.methodText, { color: colors.textSecondary }]}>
          {METHOD_LABELS[payout.payoutType] ?? payout.payoutType}
          {"  ·  "}
          {payout.currency.toUpperCase()}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Date timeline */}
      <View style={styles.dateGrid}>
        <DateRow label="Requested" value={formatDate(payout.createdAt)} colors={colors} />
        {payout.processingStartedAt ? (
          <DateRow label="Processing" value={formatDate(payout.processingStartedAt)} colorKey="primary" colors={colors} />
        ) : null}
        {payout.processedAt && payout.status === "completed" ? (
          <DateRow label="Completed" value={formatDate(payout.processedAt)} colorKey="success" colors={colors} />
        ) : null}
        {payout.processedAt && payout.status === "failed" ? (
          <DateRow label="Failed at" value={formatDate(payout.processedAt)} colorKey="danger" colors={colors} />
        ) : null}
      </View>

      {/* Failure reason */}
      {payout.failureReason ? (
        <View style={[styles.failureBox, { backgroundColor: `${colors.danger}15` }]}>
          <Feather name="alert-circle" size={13} color={colors.danger} />
          <Text style={[styles.failureText, { color: colors.danger }]}>
            {payout.failureReason}
          </Text>
        </View>
      ) : null}

      {/* Expandable details */}
      {hasDetails ? (
        <>
          <Pressable
            style={[styles.expandRow, { borderTopColor: colors.border }]}
            onPress={() => setExpanded((v) => !v)}
          >
            <Text style={[styles.expandLabel, { color: colors.textSecondary }]}>
              {expanded ? "Hide details" : "Show details"}
            </Text>
            <Feather name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.textSecondary} />
          </Pressable>

          {expanded ? (
            <View style={[styles.detailsBox, { borderTopColor: colors.border }]}>
              <InfoRow label="Payout ID" value={payout.id} mono colors={colors} />
              {payout.stripeTransferId ? (
                <InfoRow label="Transfer ID" value={truncateId(payout.stripeTransferId)} mono colors={colors} />
              ) : null}
              <InfoRow label="Currency" value={payout.currency.toUpperCase()} colors={colors} />
              <InfoRow label="Method" value={METHOD_LABELS[payout.payoutType] ?? payout.payoutType} colors={colors} />
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

export default function PayoutHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [payouts, setPayouts] = useState<CreatorPayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setPayouts(await getMyPayouts());
    } catch {
      setError("Failed to load payout history. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Payout History</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Spinner color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={load}
          >
            <Text style={[styles.retryBtnText, { color: colors.text }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : payouts.length === 0 ? (
        <View style={styles.center}>
          <Feather name="inbox" size={40} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No payouts yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Payout requests will appear here once you make a withdrawal.
          </Text>
        </View>
      ) : (
        <FlatList
          data={payouts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PayoutCard payout={item} colors={colors} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom + 24, 40) },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerTitle: { fontSize: 16, fontWeight: "bold" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  errorText: { fontSize: 14, textAlign: "center" },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  retryBtnText: { fontSize: 14, fontWeight: "600" },
  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptySubtitle: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  listContent: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: { marginBottom: 12 },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  amount: { fontSize: 20, fontWeight: "800" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  statusLabel: { fontSize: 11, fontWeight: "700" },
  methodText: { fontSize: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 12 },
  dateGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 4 },
  dateItem: { gap: 2, minWidth: 100 },
  dateLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  dateValue: { fontSize: 12, fontWeight: "500" },
  failureBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
  },
  failureText: { fontSize: 12, flex: 1, lineHeight: 18 },
  expandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  expandLabel: { fontSize: 12 },
  detailsBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 12, fontWeight: "500", flex: 1, textAlign: "right" },
});
