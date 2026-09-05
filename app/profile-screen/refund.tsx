import LegalDocumentScreen from "@/components/profile/LegalDocumentScreen";
import React from "react";

// Reuses the same screen + admin-managed document source as
// /profile-screen/terms and /profile-screen/privacy — the "refund"
// document type is managed from the admin dashboard. No legal content
// is defined here.
export default function RefundPolicyScreen() {
  return <LegalDocumentScreen type="refund" title="Refund Policy" />;
}
