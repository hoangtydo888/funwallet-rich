import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Lock } from "lucide-react";
import { PinDialog } from "./PinDialog";

const BALANCE_HIDDEN_KEY = "fun_wallet_balance_hidden";
const PIN_ENABLED_KEY = "fun_wallet_pin_enabled";
const PIN_HASH_KEY = "fun_wallet_pin_hash";

interface BalanceVisibilityContextType {
  isHidden: boolean;
  isPinEnabled: boolean;
  toggleVisibility: () => void;
  enablePin: (pin: string) => void;
  disablePin: () => void;
  verifyPin: (pin: string) => boolean;
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

// Simple hash function for PIN (in production, use proper encryption)
const hashPin = (pin: string): string => {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

interface BalanceVisibilityProviderProps {
  children: ReactNode;
}

export const BalanceVisibilityProvider = ({ children }: BalanceVisibilityProviderProps) => {
  const [isHidden, setIsHidden] = useState(() => {
    return localStorage.getItem(BALANCE_HIDDEN_KEY) === "true";
  });
  
  const [isPinEnabled, setIsPinEnabled] = useState(() => {
    return localStorage.getItem(PIN_ENABLED_KEY) === "true";
  });

  const toggleVisibility = () => {
    const newHidden = !isHidden;
    setIsHidden(newHidden);
    localStorage.setItem(BALANCE_HIDDEN_KEY, String(newHidden));
  };

  const enablePin = (pin: string) => {
    const hashed = hashPin(pin);
    localStorage.setItem(PIN_HASH_KEY, hashed);
    localStorage.setItem(PIN_ENABLED_KEY, "true");
    setIsPinEnabled(true);
  };

  const disablePin = () => {
    localStorage.removeItem(PIN_HASH_KEY);
    localStorage.removeItem(PIN_ENABLED_KEY);
    setIsPinEnabled(false);
  };

  const verifyPin = (pin: string): boolean => {
    const storedHash = localStorage.getItem(PIN_HASH_KEY);
    return storedHash === hashPin(pin);
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

  const handleToggle = () => {
    // If balance is hidden and PIN is enabled, require PIN to show
    if (isHidden && isPinEnabled) {
      setShowPinDialog(true);
    } else {
      toggleVisibility();
    }
  };

  const handlePinVerify = (pin: string) => {
    if (verifyPin(pin)) {
      toggleVisibility();
      setShowPinDialog(false);
      return true;
    }
    return false;
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        className={className}
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
