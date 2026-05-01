import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextType {
  mode: ThemeMode;       // user preference
  isDark: boolean;       // resolved actual theme
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

const STORAGE_KEY = '@theme_mode';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark'); // default dark

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        setModeState(saved);
      }
    }).catch(() => {});
  }, []);

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try { await AsyncStorage.setItem(STORAGE_KEY, newMode); } catch {}
  };

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

  return (
    <ThemeContext.Provider value={{ mode, isDark, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
