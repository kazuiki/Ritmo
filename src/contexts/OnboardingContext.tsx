import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface OnboardingContextType {
  showParentalLockOnboarding: boolean;
  currentParentalLockStep: number;
  startParentalLockOnboarding: () => void;
  nextParentalLockStep: () => void;
  completeParentalLockOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const PARENTAL_LOCK_ONBOARDING_KEY = '@parental_lock_onboarding_completed';

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [showParentalLockOnboarding, setShowParentalLockOnboarding] = useState(false);
  const [currentParentalLockStep, setCurrentParentalLockStep] = useState(0);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(PARENTAL_LOCK_ONBOARDING_KEY);
      // Don't auto-start here, let individual screens control it
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const startParentalLockOnboarding = async () => {
    try {
      const completed = await AsyncStorage.getItem(PARENTAL_LOCK_ONBOARDING_KEY);
      if (!completed) {
        setShowParentalLockOnboarding(true);
        setCurrentParentalLockStep(0);
      }
    } catch (error) {
      console.error('Error starting onboarding:', error);
    }
  };

  const nextParentalLockStep = () => {
    if (currentParentalLockStep < 1) {
      setCurrentParentalLockStep(currentParentalLockStep + 1);
    } else {
      completeParentalLockOnboarding();
    }
  };

  const completeParentalLockOnboarding = async () => {
    try {
      await AsyncStorage.setItem(PARENTAL_LOCK_ONBOARDING_KEY, 'true');
      setShowParentalLockOnboarding(false);
      setCurrentParentalLockStep(0);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        showParentalLockOnboarding,
        currentParentalLockStep,
        startParentalLockOnboarding,
        nextParentalLockStep,
        completeParentalLockOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
