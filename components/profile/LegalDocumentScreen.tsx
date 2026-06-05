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
import React, { useEffect, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
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

  useEffect(() => {
    let isMounted = true;

    const loadDocument = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const legalDocument = await getLegalDocument(type);

        if (isMounted) {
          setDocument(legalDocument);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getAuthErrorMessage(loadError, "Unable to load this document."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDocument();

    return () => {
      isMounted = false;
    };
  }, [type]);

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
          </View>
        ) : (
          document?.clauses.map((clause) => (
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
