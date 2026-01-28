/**
 * Utility for making authenticated API calls
 * Automatically includes Firebase Auth token in requests
 */

import { auth } from './firebase';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get the current user's auth token
 */
export async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  
  try {
    return await user.getIdToken(true); // Force refresh to get a fresh token
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

/**
 * Make an authenticated API request
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  
  // Ensure Content-Type is set for JSON requests
  if (options.body && typeof options.body === 'string') {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Make an authenticated POST request with JSON body
 * Returns the raw JSON response from the API
 */
export async function apiPost<T = Record<string, unknown>>(
  url: string,
  data: unknown
): Promise<T & { success?: boolean; error?: string }> {
  const response = await authenticatedFetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || `Request failed with status ${response.status}`);
  }

  return result as T & { success?: boolean; error?: string };
}

/**
 * Make an authenticated GET request
 * Returns the raw JSON response from the API
 */
export async function apiGet<T = Record<string, unknown>>(
  url: string
): Promise<T & { success?: boolean; error?: string }> {
  const response = await authenticatedFetch(url, {
    method: 'GET',
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || `Request failed with status ${response.status}`);
  }

  return result as T & { success?: boolean; error?: string };
}
