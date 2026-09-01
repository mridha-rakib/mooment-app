import BackButton from "@/components/ui/BackButton";
import { Spinner } from "@/components/ui/spinner";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import {
  getLegalDocument,
  htmlToPlainText,
  type LegalDocument,
  type LegalDocumentType,
} from "@/lib/legalDocuments";
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type LegalDocumentScreenProps = {
  type: LegalDocumentType;
  title: string;
};

export default function LegalDocumentScreen({ type, title }: LegalDocumentScreenProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocument = useCallback(async (shouldUpdate: () => boolean = () => true) => {
    setIsLoading(true);
    setError(null);

    try {
      const legalDocument = await getLegalDocument(type);

      if (shouldUpdate()) {
        setDocument(legalDocument);
      }
    } catch (loadError) {
      if (shouldUpdate()) {
        setError(getAuthErrorMessage(loadError, "Unable to load this document."));
      }
    } finally {
      if (shouldUpdate()) {
        setIsLoading(false);
      }
    }
  }, [type]);

  useEffect(() => {
    let isMounted = true;

    void loadDocument(() => isMounted);

    return () => {
      isMounted = false;
    };
  }, [loadDocument]);

  const clauses = document?.clauses ?? [];
  const hasDocumentContent = clauses.some(
    (clause) => clause.title.trim() || htmlToPlainText(clause.body).trim(),
  );

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <View style={styles.stateRow}>
            <Spinner color={colors.textSecondary} />
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>Loading...</Text>
          </View>
        ) : error ? (
          <View style={[styles.messageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.messageText, { color: colors.danger }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { borderColor: colors.border }]}
              onPress={() => {
                void loadDocument();
              }}
            >
              <Text style={[styles.retryButtonText, { color: colors.text }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : !hasDocumentContent ? (
          <View style={[styles.messageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.messageText, { color: colors.textSecondary }]}>Content unavailable</Text>
          </View>
        ) : (
          clauses.map((clause) => (
            <View key={clause.id} style={[styles.clauseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.clauseTitle, { color: colors.text }]}>{clause.title}</Text>
              <Text style={[styles.clauseBody, { color: colors.textSecondary }]}>
                {htmlToPlainText(clause.body)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
  },
  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
  },
  stateText: {
    fontSize: 13,
    fontWeight: "600",
  },
  messageCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  messageText: {
    fontSize: 14,
    fontWeight: "600",
  },
  retryButton: {
    alignSelf: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  clauseCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  clauseTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  clauseBody: {
    fontSize: 13,
    lineHeight: 20,
  },
});
