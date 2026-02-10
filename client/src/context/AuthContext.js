import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// Configure axios to send cookies with every request
axios.defaults.withCredentials = true;

const AuthContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || 'https://api.wystawoferte.pl/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    
    // Remove legacy local storage token if exists
    localStorage.removeItem('token');

    // Check authentication status on mount
    checkAuth();

    // Ensure CSRF configuration
    axios.defaults.xsrfCookieName = 'XSRF-TOKEN';
    axios.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';

    // Request interceptor to manually attach CSRF token if axios misses it
    const reqInterceptor = axios.interceptors.request.use(
      (config) => {
        if (!config.headers['X-XSRF-TOKEN'] && 
            ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
          
          const match = document.cookie.match(new RegExp('(^| )XSRF-TOKEN=([^;]+)'));
          if (match) {
            config.headers['X-XSRF-TOKEN'] = match[2];
          } else {
             console.warn('CSRF: Token not found in cookies for unsafe method');
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Axios interceptor to handle token refresh automatically
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Prevent infinite loops: don't retry if the failed request was a refresh attempt
        // or an auth endpoint check or a login attempt
        if (originalRequest.url.includes('/auth/refresh-token') || 
            (originalRequest.url.includes('/auth/verify') && originalRequest._retry) ||
            originalRequest.url.includes('/auth/login') ||
            originalRequest.url.includes('/auth/google') ||
            originalRequest.url.includes('/auth/register')) {
          return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            await axios.post(`${API_URL}/auth/refresh-token`);
            // Retry the original request
            return axios(originalRequest);
          } catch (refreshError) {
            // If refresh fails, logout user locally
            setUser(null);
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(reqInterceptor);
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/verify`);
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, code, turnstileToken) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
        code,
        turnstileToken
      });
      // Token is now in HttpOnly cookie, handled automatically
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Login failed',
        requires2FA: error.response?.status === 403 && error.response?.data?.requires2FA
      };
    }
  };

  const register = async (email, password, name, nip, referralCode, turnstileToken) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        email,
        password,
        name,
        nip: nip || null,
        referralCode: referralCode || null,
        turnstileToken
      });

      if (response.data.requiresVerification) {
        return { success: true, requiresVerification: true };
      }

      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const googleLogin = async (credential) => {
    try {
      const response = await axios.post(`${API_URL}/auth/google`, { credential });
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      const data = error.response?.data;
      return {
        success: false,
        error: data?.error || 'Logowanie przez Google nie powiodło się',
        requires_linking: data?.requires_linking || false,
        email: data?.email || ''
      };
    }
  };

  const googleLink = async (credential, email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/google/link`, {
        credential,
        email,
        password
      });
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Łączenie kont nie powiodło się'
      };
    }
  };

  const oauthLogin = async (provider, email, name, providerId) => {
    try {
      const response = await axios.post(`${API_URL}/auth/oauth/${provider}`, {
        email,
        name,
        providerId
      });
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'OAuth login failed'
      };
    }
  };

  const resendVerification = async (email) => {
    try {
      const response = await axios.post(`${API_URL}/auth/resend-verification`, { email });
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || 'Failed to resend verification email'
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`);
    } catch (error) {
      console.error('Logout error', error);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        googleLogin,
        googleLink,
        oauthLogin,
        resendVerification,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
