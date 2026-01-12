import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Lock } from "lucide-react";
import { PinDialog } from "./PinDialog";
import {
  hashPinSecure,
  verifyPinSecure,
  saveSecurePin,
  getSecurePin,
  removeSecurePin,
  isSecurePinEnabled,
  type SecurePinData,
} from "@/lib/securePin";

const BALANCE_HIDDEN_KEY = "fun_wallet_balance_hidden";
// Legacy keys (for migration)
const LEGACY_PIN_ENABLED_KEY = "fun_wallet_pin_enabled";
const LEGACY_PIN_HASH_KEY = "fun_wallet_pin_hash";

interface BalanceVisibilityContextType {
  isHidden: boolean;
  isPinEnabled: boolean;
  toggleVisibility: () => void;
  enablePin: (pin: string) => Promise<void>;
  disablePin: () => void;
  verifyPin: (pin: string) => Promise<boolean>;
  formatHiddenBalance: (balance: string) => string;
}

const BalanceVisibilityContext = createContext<BalanceVisibilityContextType | null>(null);

export const useBalanceVisibility = () => {
  const context = useContext(BalanceVisibilityContext);
  if (!context) {
    throw new Error("useBalanceVisibility must be used within BalanceVisibilityProvider");
  }
  return context;
};

interface BalanceVisibilityProviderProps {
  children: ReactNode;
}

export const BalanceVisibilityProvider = ({ children }: BalanceVisibilityProviderProps) => {
  const [isHidden, setIsHidden] = useState(() => {
    return localStorage.getItem(BALANCE_HIDDEN_KEY) === "true";
  });
  
  const [isPinEnabled, setIsPinEnabled] = useState(() => {
    // Check new secure PIN first, then legacy
    return isSecurePinEnabled() || localStorage.getItem(LEGACY_PIN_ENABLED_KEY) === "true";
  });

  // Cached secure PIN data for verification
  const [securePinData, setSecurePinData] = useState<SecurePinData | null>(() => {
    return getSecurePin();
  });

  const toggleVisibility = () => {
    const newHidden = !isHidden;
    setIsHidden(newHidden);
    localStorage.setItem(BALANCE_HIDDEN_KEY, String(newHidden));
  };

  // Secure PIN creation using PBKDF2 (100,000 iterations)
  const enablePin = async (pin: string): Promise<void> => {
    try {
      const secureData = await hashPinSecure(pin);
      saveSecurePin(secureData);
      setSecurePinData(secureData);
      setIsPinEnabled(true);
      
      // Clean up legacy storage
      localStorage.removeItem(LEGACY_PIN_HASH_KEY);
      localStorage.removeItem(LEGACY_PIN_ENABLED_KEY);
    } catch (error) {
      console.error('Error enabling PIN:', error);
      throw error;
    }
  };

  const disablePin = () => {
    removeSecurePin();
    setSecurePinData(null);
    setIsPinEnabled(false);
    
    // Clean up legacy storage too
    localStorage.removeItem(LEGACY_PIN_HASH_KEY);
    localStorage.removeItem(LEGACY_PIN_ENABLED_KEY);
  };

  // Secure PIN verification using PBKDF2
  const verifyPin = async (pin: string): Promise<boolean> => {
    const storedData = securePinData || getSecurePin();
    
    if (storedData) {
      // Use new secure verification
      return await verifyPinSecure(pin, storedData);
    }
    
    // Fallback to legacy (weak) verification for migration period
    // This will prompt user to re-create PIN with secure method
    const legacyHash = localStorage.getItem(LEGACY_PIN_HASH_KEY);
    if (legacyHash) {
      // Legacy weak hash for backwards compatibility
      let hash = 0;
      for (let i = 0; i < pin.length; i++) {
        const char = pin.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const inputHash = hash.toString(16);
      
      if (inputHash === legacyHash) {
        // Migration: automatically upgrade to secure PIN
        console.log('Migrating to secure PIN...');
        await enablePin(pin);
        return true;
      }
    }
    
    return false;
  };

  const formatHiddenBalance = (balance: string): string => {
    if (!isHidden) return balance;
    return "••••••";
  };

  return (
    <BalanceVisibilityContext.Provider
      value={{
        isHidden,
        isPinEnabled,
        toggleVisibility,
        enablePin,
        disablePin,
        verifyPin,
        formatHiddenBalance,
      }}
    >
      {children}
    </BalanceVisibilityContext.Provider>
  );
};

interface BalanceToggleButtonProps {
  className?: string;
}

export const BalanceToggleButton = ({ className }: BalanceToggleButtonProps) => {
  const { isHidden, isPinEnabled, toggleVisibility, verifyPin } = useBalanceVisibility();
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleToggle = () => {
    // If balance is hidden and PIN is enabled, require PIN to show
    if (isHidden && isPinEnabled) {
      setShowPinDialog(true);
    } else {
      toggleVisibility();
    }
  };

  const handlePinVerify = async (pin: string): Promise<boolean> => {
    setIsVerifying(true);
    try {
      const isValid = await verifyPin(pin);
      if (isValid) {
        toggleVisibility();
        setShowPinDialog(false);
        return true;
      }
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        className={className}
        disabled={isVerifying}
      >
        {isHidden ? (
          <EyeOff className="h-5 w-5" />
        ) : (
          <Eye className="h-5 w-5" />
        )}
      </Button>

      <PinDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        mode="verify"
        onVerify={handlePinVerify}
      />
    </>
  );
};
