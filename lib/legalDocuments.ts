import { api } from "@/lib/api";

export type LegalDocumentType = "terms" | "privacy";

export type LegalClause = {
  id: string;
  title: string;
  body: string;
  sortOrder: number;
};

export type LegalDocument = {
  id: string;
  type: LegalDocumentType;
  title: string;
  subtitle: string;
  clauses: LegalClause[];
  displayOnLandingPage: boolean;
  lastModifiedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const getLegalDocument = async (type: LegalDocumentType) => {
  const response = await api.get(`/settings/legal-documents/${type}`, {
    skipAuthRedirect: true,
  });

  return response.data?.data?.document as LegalDocument;
};

export const htmlToPlainText = (value: string) =>
  value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
