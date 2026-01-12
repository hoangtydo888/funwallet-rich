import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Shield, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "setup" | "verify";
  onSetup?: (pin: string) => void | Promise<void>;
  onVerify?: (pin: string) => boolean | Promise<boolean>;
}

export const PinDialog = ({
  open,
  onOpenChange,
  mode,
  onSetup,
  onVerify,
}: PinDialogProps) => {
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      setPin(["", "", "", "", "", ""]);
      setConfirmPin(["", "", "", "", "", ""]);
      setStep("enter");
      setError("");
      setIsLoading(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [open]);

  const handlePinChange = (index: number, value: string, isConfirm = false) => {
    if (!/^\d*$/.test(value) || isLoading) return;

    const newPin = isConfirm ? [...confirmPin] : [...pin];
    const refs = isConfirm ? confirmInputRefs : inputRefs;
    
    if (value.length === 1) {
      newPin[index] = value;
      if (isConfirm) {
        setConfirmPin(newPin);
      } else {
        setPin(newPin);
      }
      
      // Move to next input
      if (index < 5) {
        refs.current[index + 1]?.focus();
      }
    } else if (value.length === 0) {
      newPin[index] = "";
      if (isConfirm) {
        setConfirmPin(newPin);
      } else {
        setPin(newPin);
      }
    }

    // Auto-submit when all digits entered
    const filledPin = newPin.join("");
    if (filledPin.length === 6) {
      if (mode === "verify") {
        handleVerify(filledPin);
      } else if (mode === "setup" && step === "enter") {
        setStep("confirm");
        setTimeout(() => confirmInputRefs.current[0]?.focus(), 100);
      } else if (mode === "setup" && step === "confirm") {
        handleSetup(pin.join(""), filledPin);
      }
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent,
    isConfirm = false
  ) => {
    const refs = isConfirm ? confirmInputRefs : inputRefs;
    const currentPin = isConfirm ? confirmPin : pin;

    if (e.key === "Backspace" && !currentPin[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (enteredPin: string) => {
    if (onVerify) {
      setIsLoading(true);
      try {
        const result = onVerify(enteredPin);
        const isValid = result instanceof Promise ? await result : result;
        if (!isValid) {
          setError("Mã PIN không đúng");
          setPin(["", "", "", "", "", ""]);
          setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
      } catch (err) {
        setError("Lỗi xác thực PIN");
        setPin(["", "", "", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSetup = (firstPin: string, secondPin: string) => {
    if (firstPin !== secondPin) {
      setError("Mã PIN không khớp");
      setConfirmPin(["", "", "", "", "", ""]);
      setTimeout(() => confirmInputRefs.current[0]?.focus(), 100);
      return;
    }

    if (onSetup) {
      onSetup(firstPin);
      toast({
        title: "Đã thiết lập mã PIN",
        description: "Mã PIN của bạn đã được kích hoạt",
      });
      onOpenChange(false);
    }
  };

  const renderPinInputs = (
    pinArray: string[],
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    isConfirm = false
  ) => (
    <div className="flex gap-2 justify-center">
      {pinArray.map((digit, index) => (
        <Input
          key={index}
          ref={(el) => (refs.current[index] = el)}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handlePinChange(index, e.target.value, isConfirm)}
          onKeyDown={(e) => handleKeyDown(index, e, isConfirm)}
          className="w-12 h-14 text-center text-2xl font-mono"
        />
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[350px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              {mode === "setup" ? (
                <Shield className="h-6 w-6 text-primary" />
              ) : (
                <Lock className="h-6 w-6 text-primary" />
              )}
            </div>
          </DialogTitle>
          <DialogDescription className="text-center">
            {mode === "setup"
              ? step === "enter"
                ? "Nhập mã PIN 6 số để bảo vệ số dư ví"
                : "Nhập lại mã PIN để xác nhận"
              : "Nhập mã PIN để xem số dư"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          {mode === "setup" && step === "enter" && renderPinInputs(pin, inputRefs)}
          {mode === "setup" && step === "confirm" && renderPinInputs(confirmPin, confirmInputRefs, true)}
          {mode === "verify" && renderPinInputs(pin, inputRefs)}

          {error && (
            <p className="text-destructive text-sm text-center">{error}</p>
          )}
        </div>

        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
