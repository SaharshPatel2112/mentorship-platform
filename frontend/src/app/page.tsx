import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ textAlign: "center", padding: "80px 20px" }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "16px" }}>
        MentorSpace 🚀
      </h1>
      <p
        style={{
          fontSize: "1.1rem",
          color: "var(--color-text-muted)",
          marginBottom: "40px",
        }}
      >
        Real-time 1-on-1 mentorship with live code editor, video, and chat.
      </p>
      <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
        <Link href="/login">
          <button
            style={{
              padding: "12px 28px",
              background: "var(--color-primary)",
              color: "#fff",
              borderRadius: "var(--radius-md)",
              border: "none",
              fontSize: "1rem",
              fontWeight: 600,
            }}
          >
            Login
          </button>
        </Link>
        <Link href="/signup">
          <button
            style={{
              padding: "12px 28px",
              background: "transparent",
              color: "var(--color-primary)",
              borderRadius: "var(--radius-md)",
              border: "2px solid var(--color-primary)",
              fontSize: "1rem",
              fontWeight: 600,
            }}
          >
            Sign Up
          </button>
        </Link>
      </div>
    </main>
  );
}
