"use client";

import { useAuth } from "@clerk/nextjs";

export const useApiToken = () => {
  const { getToken } = useAuth();

  const authFetch = async (url: string, options: RequestInit = {}) => {
    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Not authenticated");
      }

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }

      return data;
    } catch (err: unknown) {
      const e = err as Error;
      throw new Error(e.message || "Failed to fetch");
    }
  };

  return { authFetch };
};
