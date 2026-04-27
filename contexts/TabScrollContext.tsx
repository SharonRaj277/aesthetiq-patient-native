import React, { createContext, useContext, ReactNode } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

interface TabScrollContextType {
  scrollY: SharedValue<number>;
}

const TabScrollContext = createContext<TabScrollContextType | null>(null);

export function TabScrollProvider({ children }: { children: ReactNode }) {
  const scrollY = useSharedValue(0);
  return (
    <TabScrollContext.Provider value={{ scrollY }}>
      {children}
    </TabScrollContext.Provider>
  );
}

export function useTabScroll(): TabScrollContextType {
  const ctx = useContext(TabScrollContext);
  if (!ctx) throw new Error('useTabScroll must be inside TabScrollProvider');
  return ctx;
}
