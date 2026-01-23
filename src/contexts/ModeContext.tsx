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
          // When lock is enabled, only clear auth if no parent tabs are authenticated
          // (Don't clear auth if user just set PIN and authenticated)
          const isParentTabAuth = ParentalLockAuthService.isTabAuthenticated('progress') ||
                                  ParentalLockAuthService.isTabAuthenticated('addRoutines') ||
                                  ParentalLockAuthService.isTabAuthenticated('settings');
          if (!isParentTabAuth) {
            ParentalLockAuthService.setAuthenticated(false);
            setMode('child');
          }
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
    // Always check current authentication status, regardless of parentalLockEnabled state
    const isParentTabAuth = ParentalLockAuthService.isTabAuthenticated('progress') ||
                            ParentalLockAuthService.isTabAuthenticated('addRoutines') ||
                            ParentalLockAuthService.isTabAuthenticated('settings');
    
    if (isParentTabAuth || !parentalLockEnabled) {
      // If already authenticated OR lock is off, switch to parent mode
      setMode('parent');
      return;
    }
    
    // If lock is on and not yet authenticated, mark intent; PIN modal will set auth
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
      if (isAuth) {
        const isParentTabAuth = ParentalLockAuthService.isTabAuthenticated('progress') ||
                                ParentalLockAuthService.isTabAuthenticated('addRoutines') ||
                                ParentalLockAuthService.isTabAuthenticated('settings');
        if (isParentTabAuth) {
          console.log('🔑 Auth listener: Switching to parent mode');
          setMode('parent');
        }
      }
    };
    
    ParentalLockAuthService.addListener(authListener);
    
    return () => {
      ParentalLockAuthService.removeListener(authListener);
    };
  }, []);

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
