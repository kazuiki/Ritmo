import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

interface OnboardingContextType {
  isFirstTimeUser: boolean;
  showOnboarding: boolean;
  currentOnboardingStep: number;
  startOnboarding: () => void;
  nextOnboardingStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  checkOnboardingStatus: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const ONBOARDING_KEY_PREFIX = '@ritmo_onboarding_completed_';
const TOTAL_ONBOARDING_STEPS = 5; // Home, Media, Progress, Settings, Add Routine

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Check if user has completed onboarding before
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    if (isChecking) {
      console.log('⏳ Already checking onboarding status, skipping...');
      return;
    }
    
    setIsChecking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsFirstTimeUser(false);
        setIsReady(true);
        setIsChecking(false);
        return;
      }
      
      const userOnboardingKey = `${ONBOARDING_KEY_PREFIX}${user.id}`;
      const hasCompleted = await AsyncStorage.getItem(userOnboardingKey);
      
      console.log('🎯 Onboarding Check:', { userId: user.id.substring(0, 8), hasCompleted, isFirstTime: !hasCompleted });
      
      if (!hasCompleted) {
        setIsFirstTimeUser(true);
      } else {
        setIsFirstTimeUser(false);
      }
      setIsReady(true);
      setIsChecking(false);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsReady(true);
      setIsChecking(false);
    }
  };

  const startOnboarding = () => {
    console.log('🚀 Starting onboarding tour...');
    console.log('Setting showOnboarding to TRUE');
    setShowOnboarding(true);
    setCurrentOnboardingStep(0);
    console.log('Onboarding state updated:', { showOnboarding: true, step: 0 });
  };

  const nextOnboardingStep = () => {
    if (currentOnboardingStep < TOTAL_ONBOARDING_STEPS - 1) {
      setCurrentOnboardingStep(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const skipOnboarding = async () => {
    setShowOnboarding(false);
    setCurrentOnboardingStep(0);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userOnboardingKey = `${ONBOARDING_KEY_PREFIX}${user.id}`;
        await AsyncStorage.setItem(userOnboardingKey, 'true');
        console.log('⏭️ Onboarding skipped for user:', user.id);
      }
      setIsFirstTimeUser(false);
    } catch (error) {
      console.error('Error saving onboarding skip:', error);
    }
  };

  const completeOnboarding = async () => {
    setShowOnboarding(false);
    setCurrentOnboardingStep(0);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userOnboardingKey = `${ONBOARDING_KEY_PREFIX}${user.id}`;
        await AsyncStorage.setItem(userOnboardingKey, 'true');
        console.log('✅ Onboarding completed for user:', user.id);
      }
      setIsFirstTimeUser(false);
    } catch (error) {
      console.error('Error saving onboarding completion:', error);
    }
  };

  const resetOnboarding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userOnboardingKey = `${ONBOARDING_KEY_PREFIX}${user.id}`;
        await AsyncStorage.removeItem(userOnboardingKey);
        console.log('🔄 Onboarding reset for user:', user.id);
      }
      setIsFirstTimeUser(true);
      setShowOnboarding(false);
      setCurrentOnboardingStep(0);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        isFirstTimeUser,
        showOnboarding,
        currentOnboardingStep,
        startOnboarding,
        nextOnboardingStep,
        skipOnboarding,
        completeOnboarding,
        resetOnboarding,
        checkOnboardingStatus,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}
