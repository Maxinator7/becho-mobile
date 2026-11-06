// API Client configuration for Mobile connecting to backend
export const API_BASE_URL = 'http://10.0.2.2:4000/api/v1'; // 10.0.2.2 for Android emulator, localhost for iOS simulator

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Mobile API Error:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Could not connect to Becho API server',
      },
    };
  }
}
