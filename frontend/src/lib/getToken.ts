'use client'

import { useAuth } from '@clerk/nextjs'

export const useApiToken = () => {
  const { getToken } = useAuth()

  const authFetch = async (url: string, options: RequestInit = {}) => {
    try {
      const token = await getToken()

      if (!token) {
        throw new Error('Not authenticated - no token')
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}${url}`,
        {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(options.headers || {}),
          },
        }
      )

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || `Request failed with status ${response.status}`)
      }

      return data

    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err
      }
      throw new Error(typeof err === 'string' ? err : 'Unknown error occurred')
    }
  }

  return { authFetch }
}