const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http:// 192.168.11.78:3000";

interface User {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

class AuthClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private user: User | null = null;

  constructor() {
    // Load tokens from localStorage on initialization
    this.accessToken = localStorage.getItem("accessToken");
    this.refreshToken = localStorage.getItem("refreshToken");
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        this.user = JSON.parse(userStr);
      } catch {
        this.user = null;
      }
    }
  }

  private saveTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  }

  private saveUser(user: User) {
    this.user = user;
    localStorage.setItem("user", JSON.stringify(user));
  }

  private clearAuth() {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  }

  getAccessToken() {
    return this.accessToken;
  }

  getUser() {
    return this.user;
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  async signUp(data: { email: string; password: string; name: string }) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          data: null,
          error: { message: errorData.message || "Failed to sign up" },
        };
      }

      const result: AuthResponse = await response.json();
      this.saveTokens(result.accessToken, result.refreshToken);
      this.saveUser(result.user);

      return { data: result, error: null };
    } catch (error) {
      return { data: null, error: { message: "An unexpected error occurred" } };
    }
  }

  async signIn(data: { email: string; password: string }) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          data: null,
          error: { message: errorData.message || "Failed to sign in" },
        };
      }

      const result: AuthResponse = await response.json();
      this.saveTokens(result.accessToken, result.refreshToken);
      this.saveUser(result.user);

      return { data: result, error: null };
    } catch (error) {
      return { data: null, error: { message: "An unexpected error occurred" } };
    }
  }

  async signOut() {
    try {
      if (this.accessToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        });
      }
    } catch {
      // Ignore errors on logout
    } finally {
      this.clearAuth();
    }
    return { data: null, error: null };
  }

  async getProfile(): Promise<{
    data: { user: User } | null;
    error: { message: string } | null;
  }> {
    try {
      if (!this.accessToken) {
        return { data: null, error: { message: "Not authenticated" } };
      }

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh token
          const refreshed = await this.refresh();
          if (refreshed.error) {
            this.clearAuth();
            return { data: null, error: { message: "Session expired" } };
          }
          // Retry with new token
          return this.getProfile();
        }
        return { data: null, error: { message: "Failed to get profile" } };
      }

      const user: User = await response.json();
      this.saveUser(user);
      return { data: { user }, error: null };
    } catch (error) {
      return { data: null, error: { message: "An unexpected error occurred" } };
    }
  }

  async refresh() {
    try {
      if (!this.refreshToken) {
        return { data: null, error: { message: "No refresh token" } };
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.refreshToken}`,
        },
      });

      if (!response.ok) {
        this.clearAuth();
        return { data: null, error: { message: "Failed to refresh token" } };
      }

      const result: TokenResponse = await response.json();
      this.saveTokens(result.accessToken, result.refreshToken);

      return { data: result, error: null };
    } catch (error) {
      this.clearAuth();
      return { data: null, error: { message: "An unexpected error occurred" } };
    }
  }

  // Helper to make authenticated requests
  async authenticatedFetch(url: string, options: RequestInit = {}) {
    if (!this.accessToken) {
      throw new Error("Not authenticated");
    }

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${this.accessToken}`,
    };

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      const refreshed = await this.refresh();
      if (refreshed.error) {
        throw new Error("Session expired");
      }
      headers.Authorization = `Bearer ${this.accessToken}`;
      response = await fetch(url, { ...options, headers });
    }

    return response;
  }
}

export const authClient = new AuthClient();

// Export convenient methods matching the original API structure
export const signIn = {
  email: (data: { email: string; password: string }) => authClient.signIn(data),
};

export const signUp = {
  email: (data: { email: string; password: string; name: string }) =>
    authClient.signUp(data),
};

export const signOut = () => authClient.signOut();
export const getProfile = () => authClient.getProfile();
