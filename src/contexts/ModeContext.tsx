import React, { createContext, useContext, useEffect, useState } from 'react';
import { ParentalLockAuthService } from '../parentalLockAuthService';
import { ParentalLockService } from '../parentalLockService';

type Mode = 'child' | 'parent';

interface ModeContextType {
  mode: Mode;
  parentalLockEnabled: boolean;
  setParentalLockEnabled: (enabled: boolean) => Promise<void>;
  enterParentMode: () => void;
  backToChildMode: () => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>('child');
  const [parentalLockEnabled, setParentalLockEnabledState] = useState<boolean>(true);

  useEffect(() => {
    // Load initial parental lock state
    const loadParentalLockState = async () => {
      const isEnabled = await ParentalLockService.isEnabled();
      setParentalLockEnabledState(isEnabled);
      
      // If lock is disabled, ensure we're authenticated
      if (!isEnabled) {
        ParentalLockAuthService.setAuthenticated(true);
      }
    };
    
    loadParentalLockState();
    
    // Poll for parental lock state changes (from parental-lock page)
    const interval = setInterval(async () => {
      const isEnabled = await ParentalLockService.isEnabled();
      if (isEnabled !== parentalLockEnabled) {
        setParentalLockEnabledState(isEnabled);
        if (!isEnabled) {
          // When lock is disabled, authenticate and go to child mode
          ParentalLockAuthService.setAuthenticated(true);
          setMode('child');
        } else {
          // When lock is enabled, clear auth and go to child mode
          ParentalLockAuthService.setAuthenticated(false);
          setMode('child');
        }
      }
    }, 500); // Check every 500ms
    
    return () => clearInterval(interval);
  }, [parentalLockEnabled]);

  const setParentalLockEnabled = async (enabled: boolean) => {
    await ParentalLockService.setEnabled(enabled);
    setParentalLockEnabledState(enabled);
    
    if (enabled) {
      // When enabling lock, clear authentication and go to child mode
      ParentalLockAuthService.setAuthenticated(false);
      setMode('child');
    } else {
      // When disabling lock, authenticate and go to child mode
      ParentalLockAuthService.setAuthenticated(true);
      setMode('child');
    }
  };

  const enterParentMode = () => {
    if (!parentalLockEnabled) {
      // If lock is off, just switch mode
      setMode('parent');
      return;
    }
    
    // If lock is on, set authentication status to trigger modal in progress/settings
    // The actual mode switch will happen after PIN verification
    ParentalLockAuthService.setAuthenticated(false, 'parent-mode');
  };

  const backToChildMode = () => {
    ParentalLockAuthService.setAuthenticated(false);
    setMode('child');
  };

  // Listen to auth changes to update mode
  useEffect(() => {
    const authListener = (isAuth: boolean) => {
      // When authenticated for parent tabs, switch to parent mode
      if (isAuth && parentalLockEnabled) {
        const isParentTabAuth = ParentalLockAuthService.isTabAuthenticated('progress') ||
                                ParentalLockAuthService.isTabAuthenticated('addRoutines') ||
                                ParentalLockAuthService.isTabAuthenticated('settings');
        if (isParentTabAuth) {
          setMode('parent');
        }
      }
    };
    
    ParentalLockAuthService.addListener(authListener);
    
    return () => {
      ParentalLockAuthService.removeListener(authListener);
    };
  }, [parentalLockEnabled]);

  return (
    <ModeContext.Provider
      value={{
        mode,
        parentalLockEnabled,
        setParentalLockEnabled,
        enterParentMode,
        backToChildMode,
      }}
    >
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}
