import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  clearOnboardingCache,
  getOnboardingPreferences,
  resetAllOnboardingPreferences,
  updateOnboardingStatus
} from '../onboardingService';
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
  checkAndStartOnboardingIfFirstLogin: () => Promise<void>;
  // Parental Lock Onboarding
  showParentalLockOnboarding: boolean;
  currentParentalLockStep: number;
  startParentalLockOnboarding: () => void;
  nextParentalLockStep: () => void;
  completeParentalLockOnboarding: () => void;
  // Add Routine Onboarding
  showAddRoutineOnboarding: boolean;
  startAddRoutineOnboarding: () => void;
  completeAddRoutineOnboarding: () => void;
  skipAddRoutineOnboarding: () => void;
  // Add Routine Modal Onboarding
  showAddRoutineModalOnboarding: boolean;
  currentAddRoutineModalStep: number;
  startAddRoutineModalOnboarding: () => void;
  nextAddRoutineModalStep: () => void;
  completeAddRoutineModalOnboarding: () => void;
  skipAddRoutineModalOnboarding: () => void;
  // Routine Preset Onboarding
  showRoutinePresetOnboarding: boolean;
  startRoutinePresetOnboarding: () => void;
  completeRoutinePresetOnboarding: () => void;
  skipRoutinePresetOnboarding: () => void;
  // Progress Onboarding
  showProgressOnboarding: boolean;
  startProgressOnboarding: () => void;
  completeProgressOnboarding: () => void;
  skipProgressOnboarding: () => void;
  resetProgressOnboarding: () => Promise<void>;
  resetAllOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const TOTAL_ONBOARDING_STEPS = 5; // Home, Media, Progress, Settings, Add Routine
const TOTAL_PARENTAL_LOCK_STEPS = 2; // Container, Toggle Switch
const LAST_USER_ID_KEY = '@ritmo_last_user_id';

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [hasCheckedFirstLogin, setHasCheckedFirstLogin] = useState(false);
  
  // Parental Lock Onboarding State
  const [showParentalLockOnboarding, setShowParentalLockOnboarding] = useState(false);
  const [currentParentalLockStep, setCurrentParentalLockStep] = useState(0);
  
  // Add Routine Onboarding State
  const [showAddRoutineOnboarding, setShowAddRoutineOnboarding] = useState(false);
  
  // Add Routine Modal Onboarding State
  const [showAddRoutineModalOnboarding, setShowAddRoutineModalOnboarding] = useState(false);
  const [currentAddRoutineModalStep, setCurrentAddRoutineModalStep] = useState(0);

  // Routine Preset Onboarding State
  const [showRoutinePresetOnboarding, setShowRoutinePresetOnboarding] = useState(false);
  
  // Progress Onboarding State
  const [showProgressOnboarding, setShowProgressOnboarding] = useState(false);

  // Check if user has completed onboarding before
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const resolveCurrentUserId = async (): Promise<string | null> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUserId = sessionData?.session?.user?.id;
    if (sessionUserId) {
      await AsyncStorage.setItem(LAST_USER_ID_KEY, sessionUserId);
      return sessionUserId;
    }

    return AsyncStorage.getItem(LAST_USER_ID_KEY);
  };

  // Listen for auth state changes to reset first login check flag
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        console.log('🔄 User signed out, resetting first login check flag and clearing cache');
        setHasCheckedFirstLogin(false);
        await clearOnboardingCache();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkOnboardingStatus = async () => {
    if (isChecking) {
      console.log('⏳ Already checking onboarding status, skipping...');
      return;
    }
    
    setIsChecking(true);
    try {
      const userId = await resolveCurrentUserId();
      if (!userId) {
        setIsFirstTimeUser(false);
        setIsReady(true);
        setIsChecking(false);
        return;
      }
      
      // Cache-first read (JSON/local), with background refresh when online.
      const preferences = await getOnboardingPreferences(userId);
      
      console.log('🎯 Onboarding Check:', { 
        userId: userId.substring(0, 8), 
        hasCompleted: preferences?.main_tour_completed,
        isFirstTime: !preferences?.main_tour_completed 
      });
      
      if (!preferences || !preferences.main_tour_completed) {
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

  const checkAndStartOnboardingIfFirstLogin = async () => {
    // Only check once per session
    if (hasCheckedFirstLogin) {
      console.log('⏭️ Already checked first login in this session, skipping...');
      return;
    }
    
    console.log('🔍 Checking first login status...');
    setHasCheckedFirstLogin(true);
    
    try {
      const userId = await resolveCurrentUserId();
      if (!userId) {
        console.log('❌ No user found for first login check');
        return;
      }
      
      // Cache-first read for immediate onboarding decision.
      const preferences = await getOnboardingPreferences(userId);
      console.log('📋 Database preferences:', preferences);
      
      if (!preferences || !preferences.main_tour_completed) {
        console.log('🎯 First login detected - starting onboarding tour...');
        // Delay to let the screen render first
        setTimeout(() => {
          startOnboarding();
        }, 1000);
      } else {
        console.log('✅ User has completed onboarding before, skipping...');
      }
    } catch (error) {
      console.error('Error checking first login onboarding:', error);
    }
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
      const userId = await resolveCurrentUserId();
      if (userId) {
        await updateOnboardingStatus(userId, 'main_tour_completed', true);
        console.log('⏭️ Onboarding skipped for user:', userId);
      }
      setIsFirstTimeUser(false);
    } catch (error) {
      console.error('Error saving onboarding skip:', error);
    }
  };

  const completeOnboarding = async () => {
    console.log('🎯 completeOnboarding called');
    setShowOnboarding(false);
    setCurrentOnboardingStep(0);
    try {
      const userId = await resolveCurrentUserId();
      if (userId) {
        console.log('💾 Saving onboarding completion to database');
        const success = await updateOnboardingStatus(userId, 'main_tour_completed', true);
        if (success) {
          console.log('✅ Onboarding completed for user:', userId);
        } else {
          console.log('⚠️ Failed to save onboarding completion');
        }
      } else {
        console.log('⚠️ No user found when completing onboarding');
      }
      setIsFirstTimeUser(false);
    } catch (error) {
      console.error('Error saving onboarding completion:', error);
    }
  };

  const resetOnboarding = async () => {
    try {
      const userId = await resolveCurrentUserId();
      if (userId) {
        await updateOnboardingStatus(userId, 'main_tour_completed', false);
        console.log('🔄 Onboarding reset for user:', userId);
      }
      setIsFirstTimeUser(true);
      setShowOnboarding(false);
      setCurrentOnboardingStep(0);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  };

  // Parental Lock Onboarding Functions
  const startParentalLockOnboarding = async () => {
    try {
      const userId = await resolveCurrentUserId();
      if (!userId) return;
      
      // Check if user has already completed this onboarding
      const preferences = await getOnboardingPreferences(userId);
      
      if (!preferences || !preferences.parental_lock_completed) {
        console.log('🔒 Starting Parental Lock onboarding...');
        setShowParentalLockOnboarding(true);
        setCurrentParentalLockStep(0);
      } else {
        console.log('✅ Parental Lock onboarding already completed, skipping...');
      }
    } catch (error) {
      console.error('Error starting parental lock onboarding:', error);
    }
  };

  const nextParentalLockStep = () => {
    if (currentParentalLockStep < TOTAL_PARENTAL_LOCK_STEPS - 1) {
      setCurrentParentalLockStep(prev => prev + 1);
    } else {
      completeParentalLockOnboarding();
    }
  };

  const completeParentalLockOnboarding = async () => {
    setShowParentalLockOnboarding(false);
    setCurrentParentalLockStep(0);
    try {
      const userId = await resolveCurrentUserId();
      if (userId) {
        await updateOnboardingStatus(userId, 'parental_lock_completed', true);
        console.log('✅ Parental Lock onboarding completed for user:', userId);
      }
    } catch (error) {
      console.error('Error saving parental lock onboarding completion:', error);
    }
  };

  // Add Routine Onboarding Functions
  const startAddRoutineOnboarding = async () => {
    console.log('🔍 startAddRoutineOnboarding called');
    try {
      const userId = await resolveCurrentUserId();
      if (!userId) {
        console.log('❌ No user found for Add Routine onboarding');
        return;
      }
      
      // Check if user has already completed this onboarding
      const preferences = await getOnboardingPreferences(userId);
      
      if (!preferences || !preferences.add_routine_completed) {
        console.log('➕ Starting Add Routine onboarding...');
        setShowAddRoutineOnboarding(true);
      } else {
        console.log('✅ Add Routine onboarding already completed, skipping...');
      }
    } catch (error) {
      console.error('Error starting add routine onboarding:', error);
    }
  };

  const completeAddRoutineOnboarding = async () => {
    setShowAddRoutineOnboarding(false);
    try {
      const userId = await resolveCurrentUserId();
      if (userId) {
        await updateOnboardingStatus(userId, 'add_routine_completed', true);
        console.log('✅ Add Routine onboarding completed for user:', userId);
      }
    } catch (error) {
      console.error('Error saving add routine onboarding completion:', error);
    }
  };

  const skipAddRoutineOnboarding = async () => {
    setShowAddRoutineOnboarding(false);
    try {
      const userId = await resolveCurrentUserId();
      if (userId) {
        await updateOnboardingStatus(userId, 'add_routine_completed', true);
        console.log('⏭️ Add Routine onboarding skipped for user:', userId);
      }
    } catch (error) {
      console.error('Error saving add routine onboarding skip:', error);
    }
  };
  // Progress Onboarding Functions
  const startProgressOnboarding = async () => {
    console.log('🔍 startProgressOnboarding called');
    try {
      const userId = await resolveCurrentUserId();
      if (!userId) {
        console.log('❌ No user found for Progress onboarding');
        return;
      }
      
      // Check if user has already completed this onboarding
      const preferences = await getOnboardingPreferences(userId);
      console.log('🔑 Progress preferences:', preferences);
      
      if (!preferences || !preferences.progress_completed) {
        console.log('📊 Starting Progress onboarding...');
        setShowProgressOnboarding(true);
      } else {
        console.log('✅ Progress onboarding already completed, skipping...');
      }
    } catch (error) {
      console.error('Error starting progress onboarding:', error);
    }
  };

  const completeProgressOnboarding = async () => {
    console.log('🎯 completeProgressOnboarding called');
    setShowProgressOnboarding(false);
    try {
      const userId = await resolveCurrentUserId();
      if (userId) {
        console.log('💾 Saving Progress completion to database');
        await updateOnboardingStatus(userId, 'progress_completed', true);
        console.log('✅ Progress onboarding completed for user:', userId);
      }
    } catch (error) {
      console.error('Error saving progress onboarding completion:', error);
    }
  };

  const skipProgressOnboarding = async () => {
    console.log('⏭️ skipProgressOnboarding called');
    setShowProgressOnboarding(false);
    try {
      const userId = await resolveCurrentUserId();
      if (userId) {
        await updateOnboardingStatus(userId, 'progress_completed', true);
        console.log('⏭️ Progress onboarding skipped for user:', userId);
      }
    } catch (error) {
      console.error('Error saving progress onboarding skip:', error);
    }
  };

  const resetProgressOnboarding = async () => {
    console.log('🔄 resetProgressOnboarding called');
    try {
      const userId = await resolveCurrentUserId();
      if (userId) {
        await updateOnboardingStatus(userId, 'progress_completed', false);
        console.log('🔄 Progress onboarding reset for user:', userId);
      }
      setShowProgressOnboarding(false);
    } catch (error) {
      console.error('Error resetting progress onboarding:', error);
    }
  };

  const resetAllOnboarding = async () => {
    console.log('🔄 resetAllOnboarding called');
    try {
      const userId = await resolveCurrentUserId();
      if (!userId) return;

      // Reset all onboarding preferences in database
      await resetAllOnboardingPreferences(userId);

      setShowOnboarding(false);
      setCurrentOnboardingStep(0);
      setShowParentalLockOnboarding(false);
      setCurrentParentalLockStep(0);
      setShowAddRoutineOnboarding(false);
      setShowAddRoutineModalOnboarding(false);
      setCurrentAddRoutineModalStep(0);
      setShowRoutinePresetOnboarding(false);
      setShowProgressOnboarding(false);
      setIsFirstTimeUser(true);
      setHasCheckedFirstLogin(false);

      console.log('✅ All onboarding states reset for user:', userId);
    } catch (error) {
      console.error('Error resetting all onboarding state:', error);
      throw error;
    }
  };
  // Add Routine Modal Onboarding Functions
  const startAddRoutineModalOnboarding = async () => {
    console.log('🔍 startAddRoutineModalOnboarding called');
    try {
      const userId = await resolveCurrentUserId();
      if (!userId) {
        console.log('❌ No user found for Add Routine Modal onboarding');
        return;
      }
      
      // Check if user has already completed this onboarding
      const preferences = await getOnboardingPreferences(userId);
      console.log('🔑 Add Routine Modal preferences:', preferences);
      
      if (!preferences || !preferences.add_routine_modal_completed) {
        console.log('📝 Starting Add Routine Modal onboarding...');
        setShowAddRoutineModalOnboarding(true);
        setCurrentAddRoutineModalStep(0);
      } else {
        console.log('✅ Add Routine Modal onboarding already completed, skipping...');
      }
    } catch (error) {
      console.error('Error starting add routine modal onboarding:', error);
    }
  };

  const nextAddRoutineModalStep = () => {
    if (currentAddRoutineModalStep < 4) { // 5 steps (0-4)
      setCurrentAddRoutineModalStep(prev => prev + 1);
    } else {
      completeAddRoutineModalOnboarding();
    }
  };

  const completeAddRoutineModalOnboarding = async () => {
    console.log('🎯 completeAddRoutineModalOnboarding called');
    setShowAddRoutineModalOnboarding(false);
    setCurrentAddRoutineModalStep(0);
    try {
      const userId = await resolveCurrentUserId();
      if (userId) {
        console.log('💾 Saving Add Routine Modal completion to database');
        await updateOnboardingStatus(userId, 'add_routine_modal_completed', true);
        console.log('✅ Add Routine Modal onboarding completed for user:', userId);
      }
    } catch (error) {
      console.error('Error saving add routine modal onboarding completion:', error);
    }
  };

  const skipAddRoutineModalOnboarding = async () => {
    console.log('⏭️ skipAddRoutineModalOnboarding called');
    setShowAddRoutineModalOnboarding(false);
    setCurrentAddRoutineModalStep(0);
    try {
      const userId = await resolveCurrentUserId();
      if (userId) {
        await updateOnboardingStatus(userId, 'add_routine_modal_completed', true);
        console.log('⏭️ Add Routine Modal onboarding skipped for user:', userId);
      }
    } catch (error) {
      console.error('Error saving add routine modal onboarding skip:', error);
    }
  };

  // Routine Preset Onboarding Functions
  const startRoutinePresetOnboarding = async () => {
    console.log('🔍 startRoutinePresetOnboarding called');
    try {
      const userId = await resolveCurrentUserId();
      if (!userId) {
        console.log('❌ No user found for Routine Preset onboarding');
        return;
      }

      const preferences = await getOnboardingPreferences(userId);

      if (!preferences || !preferences.routine_preset_completed) {
        console.log('📘 Starting Routine Preset onboarding...');
        setShowRoutinePresetOnboarding(true);
      } else {
        console.log('✅ Routine Preset onboarding already completed, skipping...');
      }
    } catch (error) {
      console.error('Error starting routine preset onboarding:', error);
    }
  };

  const completeRoutinePresetOnboarding = async () => {
    setShowRoutinePresetOnboarding(false);
    try {
      const userId = await resolveCurrentUserId();
      if (userId) {
        await updateOnboardingStatus(userId, 'routine_preset_completed', true);
        console.log('✅ Routine Preset onboarding completed for user:', userId);
      }
    } catch (error) {
      console.error('Error saving routine preset onboarding completion:', error);
    }
  };

  const skipRoutinePresetOnboarding = async () => {
    setShowRoutinePresetOnboarding(false);
    try {
      const userId = await resolveCurrentUserId();
      if (userId) {
        await updateOnboardingStatus(userId, 'routine_preset_completed', true);
        console.log('⏭️ Routine Preset onboarding skipped for user:', userId);
      }
    } catch (error) {
      console.error('Error saving routine preset onboarding skip:', error);
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
        checkAndStartOnboardingIfFirstLogin,
        // Parental Lock Onboarding
        showParentalLockOnboarding,
        currentParentalLockStep,
        startParentalLockOnboarding,
        nextParentalLockStep,
        completeParentalLockOnboarding,
        // Add Routine Onboarding
        showAddRoutineOnboarding,
        startAddRoutineOnboarding,
        completeAddRoutineOnboarding,
        skipAddRoutineOnboarding,
        // Add Routine Modal Onboarding
        showAddRoutineModalOnboarding,
        currentAddRoutineModalStep,
        startAddRoutineModalOnboarding,
        nextAddRoutineModalStep,
        completeAddRoutineModalOnboarding,
        skipAddRoutineModalOnboarding,
        // Routine Preset Onboarding
        showRoutinePresetOnboarding,
        startRoutinePresetOnboarding,
        completeRoutinePresetOnboarding,
        skipRoutinePresetOnboarding,
        // Progress Onboarding
        showProgressOnboarding,
        startProgressOnboarding,
        completeProgressOnboarding,
        skipProgressOnboarding,
        resetProgressOnboarding,
        resetAllOnboarding,
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
