import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || 'https://api.wystawoferte.pl/api';

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage first for immediate UI response
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  useEffect(() => {
    // Load theme preference from backend if user is logged in
    if (user) {
      fetchThemePreference();
    }
  }, [user]);

  const fetchThemePreference = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/preferences`);
      const prefs = response.data.preferences;
      if (prefs?.dark_mode !== undefined) {
        setDarkMode(prefs.dark_mode);
        localStorage.setItem('darkMode', prefs.dark_mode.toString());
      }
    } catch (error) {
      console.error('Error fetching theme preference:', error);
      // Fallback to localStorage if backend fails
    }
  };

  const toggleDarkMode = async (newValue) => {
    const value = newValue !== undefined ? newValue : !darkMode;
    setDarkMode(value);
    localStorage.setItem('darkMode', value.toString());

    // Save to backend if user is logged in
    if (user) {
      try {
        await axios.put(
          `${API_URL}/user/preferences`,
          { dark_mode: value }
        );
      } catch (error) {
        console.error('Error saving theme preference:', error);
        // Continue anyway - preference is saved in localStorage
      }
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        darkMode,
        toggleDarkMode
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
