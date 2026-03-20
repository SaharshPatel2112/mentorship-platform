"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const role = user?.unsafeMetadata?.role as string | undefined;

    if (!role) {
      router.push("/onboarding");
    } else if (role === "mentor") {
      router.push("/dashboard/mentor");
    } else {
      router.push("/dashboard/student");
    }
  }, [user, isLoaded, router]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
      }}
    >
      <p style={{ color: "var(--color-text-muted)" }}>Redirecting...</p>
    </div>
  );
}
