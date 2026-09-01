import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function AddStripeCompatibilityRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/profile-screen/bank-account" as never);
  }, [router]);

  return null;
}
