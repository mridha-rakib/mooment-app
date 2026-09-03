import LegalDocumentScreen from "@/components/profile/LegalDocumentScreen";
import React from "react";

// Auth-stack route so the signup consent link is reachable before login.
// Reuses the same screen + admin-managed document source as
// /profile-screen/privacy — no legal content is defined here.
export default function AuthPrivacyScreen() {
  return <LegalDocumentScreen type="privacy" title="Privacy & Policy" />;
}
