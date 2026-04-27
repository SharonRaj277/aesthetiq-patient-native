import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────
interface HealthProfile {
  version: number;
  completedAt: string;
  updatedAt: string;
  declarationAccepted: boolean;
  declarationAcceptedAt: string;
  conditions: string[];
  pregnant: boolean;
  breastfeeding: boolean;
  hasImplantedDevice: boolean;
  onBloodThinners: boolean;
  onRetinoids: boolean;
  onSteroids: boolean;
  medications: string[];
  smoker: string;
  tobaccoChewer: boolean;
  alcohol: string;
  skinConditions: string[];
  allergies: string[];
  recentTreatments: string[];
  hadAdverseReaction: boolean;
  adverseReactionDetail: string | null;
  profileCompletionScore: number;
  // Extended fields from inline edit screen
  implantDevices: string[];
  lifestyleHabits: string[];
  outsideTreatments: string[];
}

interface HealthProfileContextType {
  healthProfile: HealthProfile | null;
  loading: boolean;
  updateHealthProfile: (data: any) => Promise<void>;
  isProfileComplete: () => boolean;
}

const HealthProfileContext = createContext<HealthProfileContextType | null>(null);

// ─── calculateCompletionScore ─────────────────────────────────────
const calculateCompletionScore = (hp: any): number => {
  let score = 0;

  // Conditions filled meaningfully — exclude 'none'
  if (hp.conditions?.length > 0 && !hp.conditions.includes('none')) score += 20;

  // Medications filled meaningfully — exclude 'none'
  if (hp.medications?.length > 0 && !hp.medications.includes('none')) score += 15;

  // Lifestyle answers given
  if (hp.smoker && hp.smoker !== undefined) score += 10;
  if (hp.alcohol && hp.alcohol !== undefined) score += 10;

  // Skin conditions answered
  if (hp.skinConditions?.length > 0) score += 15;

  // Allergies filled
  if (hp.allergies?.length > 0) score += 10;

  // Declaration signed (mandatory)
  if (hp.declarationAccepted === true) score += 20;

  return Math.min(score, 100);
};

// ─── shouldShowHealthCheck (exported) ────────────────────────────
export const shouldShowHealthCheck = (hp: any): boolean => {
  // No profile at all → show full setup
  if (!hp) return true;

  const lastUpdated = new Date(hp.updatedAt || 0);
  const now = new Date();
  const daysDiff =
    (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

  // Always show if > 7 days since update
  if (daysDiff > 7) return true;

  // Always show for high-risk conditions regardless of update recency
  if (hp.pregnant) return true;
  if (hp.onBloodThinners) return true;
  if (hp.hasImplantedDevice) return true;
  if (hp.conditions?.includes('cancer')) return true;

  // Otherwise skip the check
  return false;
};

// ─── Provider ─────────────────────────────────────────────────────
export function HealthProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Step 1: Check AsyncStorage first (instant, no network needed)
      const local = await AsyncStorage.getItem('healthProfile');

      if (local) {
        setHealthProfile(JSON.parse(local));
        setLoading(false);
        return;
      }

      // Step 2: AsyncStorage empty — set null for now
      // When Firebase added, replace with Firestore fetch here
      setHealthProfile(null);

    } catch (e) {
      console.error('Health profile load error:', e);
      setHealthProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const updateHealthProfile = async (data: any) => {
    const updated = {
      ...data,
      updatedAt: new Date().toISOString(),
      version: 1,
      profileCompletionScore: calculateCompletionScore(data),
    };

    await AsyncStorage.setItem('healthProfile', JSON.stringify(updated));

    setHealthProfile(updated);
    // Firebase sync added later when backend is connected
  };

  const isProfileComplete = (): boolean => {
    if (!healthProfile) return false;
    // Declaration is the legal requirement.
    // If signed, profile is complete enough.
    return healthProfile.declarationAccepted === true;
  };

  return (
    <HealthProfileContext.Provider
      value={{ healthProfile, loading, updateHealthProfile, isProfileComplete }}
    >
      {children}
    </HealthProfileContext.Provider>
  );
}

export function useHealthProfile() {
  const ctx = useContext(HealthProfileContext);
  if (!ctx)
    throw new Error('useHealthProfile must be used within HealthProfileProvider');
  return ctx;
}
