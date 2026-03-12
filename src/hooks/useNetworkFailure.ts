    import { useEffect, useRef, useState } from 'react';
import { isNetworkConnected } from '../utils/networkUtils';

interface UseNetworkFailureReturn {
  showNetworkFailureModal: boolean;
  handleRetry: () => void;
}

interface UseNetworkFailureOptions {
  enabled?: boolean;
}

export const useNetworkFailure = (options?: UseNetworkFailureOptions): UseNetworkFailureReturn => {
  const enabled = options?.enabled ?? true;
  const [showNetworkFailureModal, setShowNetworkFailureModal] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const retryTimeoutRef = useRef<any>(null);

  const checkConnectivity = async () => {
    if (!enabled) {
      if (showNetworkFailureModal) {
        setShowNetworkFailureModal(false);
      }
      return;
    }

    if (isChecking) return; // Prevent multiple simultaneous checks
    
    setIsChecking(true);
    try {
      const isConnected = await isNetworkConnected();
      
      if (!isConnected) {
        // Show modal if not already shown
        if (!showNetworkFailureModal) {
          console.log('❌ No network connection detected - showing failure modal');
          setShowNetworkFailureModal(true);
        }
      } else {
        // Hide modal if connection is restored
        if (showNetworkFailureModal) {
          console.log('✅ Network connection restored - hiding failure modal');
          setShowNetworkFailureModal(false);
        }
      }
    } catch (error) {
      console.error('Network connectivity check failed:', error);
      // On error, assume no connection and show modal
      if (!showNetworkFailureModal) {
        setShowNetworkFailureModal(true);
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleRetry = async () => {
    if (!enabled) {
      setShowNetworkFailureModal(false);
      return;
    }

    console.log('🔄 User requested network retry...');
    
    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    // Check connectivity immediately
    await checkConnectivity();
    
    // If still no connection, schedule another check after 3 seconds
    if (showNetworkFailureModal) {
      retryTimeoutRef.current = setTimeout(() => {
        checkConnectivity();
      }, 3000);
    }
  };

  useEffect(() => {
    let initialCheckTimeout: any;
    let checkInterval: any;

    if (!enabled) {
      setShowNetworkFailureModal(false);
      return () => {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
      };
    }

    // Initial connectivity check after a short delay
    initialCheckTimeout = setTimeout(() => {
      checkConnectivity();
    }, 1000);

    // Setup periodic checks for network connectivity failure
    // This runs independently of the main network quality checks
    checkInterval = setInterval(() => {
      checkConnectivity();
    }, 5000); // Check every 5 seconds for complete network failure

    return () => {
      if (initialCheckTimeout) {
        clearTimeout(initialCheckTimeout);
      }
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [enabled, showNetworkFailureModal, isChecking]);

  return {
    showNetworkFailureModal,
    handleRetry,
  };
};