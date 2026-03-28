"use client";

import { useAuth } from "@clerk/nextjs";

const isCancellation = (err: unknown): boolean => {
  if (!err || typeof err !== "object") return false;
  const e = err as Record<string, unknown>;
  return (
    e.type === "cancelation" ||
    e.msg === "operation is manually canceled" ||
    String(e.message || "").includes("cancel") ||
    String(e.message || "").includes("unmount")
  );
};

export const useApiToken = () => {
  const { getToken } = useAuth();

  const authFetch = async (
    url: string,
    options: RequestInit = {},
  ): Promise<unknown> => {
    let token: string | null = null;

    try {
      token = await getToken();
    } catch (err: unknown) {
      if (isCancellation(err)) {
        console.log("Token cancelled — component unmounted");
        return null;
      }
      throw new Error("Failed to get auth token");
    }

    if (!token) return null;

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
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : typeof data.message === "string"
              ? data.message
              : `Request failed: ${response.status}`,
        );
      }

      return data;
    } catch (err: unknown) {
      if (isCancellation(err)) {
        console.log("Request cancelled — ignoring");
        return null;
      }
      if (err instanceof Error) throw err;

      const errorMessage =
        typeof err === "object" && err !== null
          ? JSON.stringify(err)
          : String(err);

      throw new Error(errorMessage);
    }
  };

  return { authFetch };
};
