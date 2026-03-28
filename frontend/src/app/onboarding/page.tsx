"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import "./onboarding.css";

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [role, setRole] = useState<"mentor" | "student">("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async () => {
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      await user.update({
        unsafeMetadata: { role },
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/users/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerkId: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            full_name: user.fullName || user.firstName || "User",
            role,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Sync failed");
      }

      // Force reload so Clerk metadata updates before redirect
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <div className="onboarding-title">Welcome to MentorSpace 🚀</div>
        <div className="onboarding-subtitle">
          Tell us your role so we can set up your experience
        </div>

        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              padding: "10px 14px",
              borderRadius: "6px",
              marginBottom: "16px",
              fontSize: "0.9rem",
            }}
          >
            {error}
          </div>
        )}

        <div className="role-selector">
          <div
            className={`role-option ${role === "mentor" ? "selected" : ""}`}
            onClick={() => setRole("mentor")}
          >
            <div className="role-icon">👨‍🏫</div>
            <div className="role-title">Mentor</div>
            <div className="role-desc">I will teach & guide students</div>
          </div>
          <div
            className={`role-option ${role === "student" ? "selected" : ""}`}
            onClick={() => setRole("student")}
          >
            <div className="role-icon">👨‍💻</div>
            <div className="role-title">Student</div>
            <div className="role-desc">I want to learn & grow</div>
          </div>
        </div>

        <button
          className="onboarding-btn"
          onClick={handleContinue}
          disabled={loading}
        >
          {loading ? "Setting up..." : "Continue →"}
        </button>
      </div>
    </div>
  );
}
