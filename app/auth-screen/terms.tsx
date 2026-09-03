import LegalDocumentScreen from "@/components/profile/LegalDocumentScreen";
import React from "react";

// Auth-stack route so the signup consent link is reachable before login.
// Reuses the same screen + admin-managed document source as
// /profile-screen/terms — no legal content is defined here.
export default function AuthTermsScreen() {
  return <LegalDocumentScreen type="terms" title="Terms & Conditions" />;
}
