/**
 * FUN Wallet - Seed Quiz Dialog
 * 
 * Verifies user has correctly backed up their seed phrase
 * by asking them to identify 3 random words
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle,
  ArrowLeft,
  PartyPopper
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { logBackupVerified } from '@/lib/securityLogger';

// Common BIP-39 words for wrong answers
const DECOY_WORDS = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
  'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
  'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
  'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
  'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
  'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album',
  'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone',
  'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among',
];

interface SeedQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mnemonic: string;
  walletAddress?: string;
  onQuizComplete: () => void;
  onRetry: () => void;
}

interface QuizQuestion {
  wordIndex: number; // 0-indexed position in mnemonic
  correctWord: string;
  options: string[];
}

export const SeedQuizDialog = ({
  open,
  onOpenChange,
  mnemonic,
  walletAddress,
  onQuizComplete,
  onRetry,
}: SeedQuizDialogProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [completed, setCompleted] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);

  const words = useMemo(() => mnemonic.split(' ').filter(w => w.trim()), [mnemonic]);

  // Generate 3 random questions
  const questions: QuizQuestion[] = useMemo(() => {
    if (words.length < 12) return [];

    // Pick 3 random positions (not adjacent)
    const positions: number[] = [];
    const available = [...Array(words.length).keys()];
    
    while (positions.length < 3 && available.length > 0) {
      const idx = Math.floor(Math.random() * available.length);
      const pos = available.splice(idx, 1)[0];
      positions.push(pos);
    }
    
    positions.sort((a, b) => a - b);

    return positions.map(pos => {
      const correctWord = words[pos];
      
      // Get 3 random decoys that aren't in the mnemonic
      const decoys: string[] = [];
      const usedDecoys = new Set(words.map(w => w.toLowerCase()));
      
      while (decoys.length < 3) {
        const decoy = DECOY_WORDS[Math.floor(Math.random() * DECOY_WORDS.length)];
        if (!usedDecoys.has(decoy.toLowerCase())) {
          usedDecoys.add(decoy.toLowerCase());
          decoys.push(decoy);
        }
      }

      // Shuffle options
      const options = [correctWord, ...decoys].sort(() => Math.random() - 0.5);

      return {
        wordIndex: pos,
        correctWord,
        options,
      };
    });
  }, [words]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentQuestion(0);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setCompleted(false);
      setWrongAttempts(0);
    }
  }, [open]);

  const handleSelectAnswer = (answer: string) => {
    if (selectedAnswer !== null) return; // Already answered

    setSelectedAnswer(answer);
    const correct = answer === questions[currentQuestion]?.correctWord;
    setIsCorrect(correct);

    if (!correct) {
      setWrongAttempts(prev => prev + 1);
    }

    // Auto-advance after delay
    setTimeout(() => {
      if (correct) {
        if (currentQuestion < questions.length - 1) {
          setCurrentQuestion(prev => prev + 1);
          setSelectedAnswer(null);
          setIsCorrect(null);
        } else {
          handleComplete();
        }
      }
    }, 1000);
  };

  const handleComplete = async () => {
    setCompleted(true);
    if (walletAddress) {
      await logBackupVerified(walletAddress);
    }
  };

  const handleFinish = () => {
    onOpenChange(false);
    onQuizComplete();
    toast({
      title: '🎉 Backup đã được xác minh!',
      description: 'Seed phrase của bạn đã được sao lưu an toàn',
    });
  };

  const handleRetry = () => {
    onOpenChange(false);
    onRetry();
  };

  const progress = ((currentQuestion + (isCorrect ? 1 : 0)) / questions.length) * 100;

  if (questions.length === 0) {
    return null;
  }

  const currentQ = questions[currentQuestion];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {!completed ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <HelpCircle className="h-5 w-5 text-primary" />
                Xác minh Seed Phrase
              </DialogTitle>
              <DialogDescription>
                Câu hỏi {currentQuestion + 1} / {questions.length}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-4">
              {/* Progress bar */}
              <Progress value={progress} className="h-2" />

              {/* Question */}
              <div className="text-center py-4">
                <p className="text-lg font-medium">
                  Từ thứ <span className="text-primary font-bold">{currentQ.wordIndex + 1}</span> trong seed phrase là gì?
                </p>
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-3">
                {currentQ.options.map((option, idx) => {
                  const isSelected = selectedAnswer === option;
                  const isCorrectAnswer = option === currentQ.correctWord;
                  const showResult = selectedAnswer !== null;

                  let variant: 'default' | 'outline' | 'destructive' = 'outline';
                  let className = '';

                  if (showResult) {
                    if (isCorrectAnswer) {
                      className = 'border-success bg-success/10 text-success';
                    } else if (isSelected && !isCorrectAnswer) {
                      className = 'border-destructive bg-destructive/10 text-destructive';
                    }
                  }

                  return (
                    <Button
                      key={idx}
                      variant={variant}
                      className={`h-12 font-mono text-base ${className}`}
                      onClick={() => handleSelectAnswer(option)}
                      disabled={selectedAnswer !== null}
                    >
                      {showResult && isCorrectAnswer && (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      {showResult && isSelected && !isCorrectAnswer && (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      {option}
                    </Button>
                  );
                })}
              </div>

              {/* Wrong answer feedback */}
              {isCorrect === false && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-center space-y-3">
                  <p className="font-medium">Không đúng!</p>
                  <p className="text-sm">
                    Hãy xem lại seed phrase và thử lại.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Xem lại Seed Phrase
                  </Button>
                </div>
              )}

              {/* Wrong attempts warning */}
              {wrongAttempts > 0 && wrongAttempts < 3 && isCorrect !== false && (
                <p className="text-xs text-center text-muted-foreground">
                  Số lần sai: {wrongAttempts}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <PartyPopper className="h-5 w-5 text-success" />
                Hoàn tất!
              </DialogTitle>
            </DialogHeader>

            <div className="py-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  Backup đã được xác minh!
                </h3>
                <p className="text-muted-foreground">
                  Ví của bạn đã được sao lưu an toàn. Giữ seed phrase ở nơi bí mật.
                </p>
              </div>

              <div className="bg-success/5 border border-success/20 rounded-lg p-4 text-sm text-left">
                <p className="font-medium text-success mb-2">✅ Việc cần làm:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Cất seed phrase ở nơi an toàn</li>
                  <li>• Cân nhắc lưu bản sao thứ 2 ở vị trí khác</li>
                  <li>• Không lưu trên điện thoại hoặc máy tính</li>
                </ul>
              </div>

              <Button onClick={handleFinish} className="w-full">
                Hoàn tất
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
