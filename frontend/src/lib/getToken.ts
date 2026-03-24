"use client";

import { useAuth } from "@clerk/nextjs";

const isCancellation = (err: unknown): boolean => {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    return (
      e.type === "cancelation" || e.msg === "operation is manually canceled"
    );
  }
  return false;
};

export const useApiToken = () => {
  const { getToken } = useAuth();

  const authFetch = async (url: string, options: RequestInit = {}) => {
    let token: string | null = null;
    try {
      token = await getToken();
    } catch (err: unknown) {
      if (isCancellation(err)) {
        console.log("Clerk token request cancelled — ignoring");
        return null;
      }
      throw new Error("Failed to get auth token");
    }

    if (!token) {
      throw new Error("Not authenticated - no token");
    }
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}${url}`,
        {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
          },
        },
      );

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          `Server error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            `Request failed with status ${response.status}`,
        );
      }

      return data;
    } catch (err: unknown) {
      if (isCancellation(err)) {
        console.log("Request cancelled — ignoring");
        return null;
      }
      if (err instanceof Error) throw err;
      throw new Error("Unknown error occurred");
    }
  };

  return { authFetch };
};
