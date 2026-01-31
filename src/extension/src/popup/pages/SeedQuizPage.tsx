import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Check, X, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface SeedQuizPageProps {
  mnemonic: string;
  onBack: () => void;
  onComplete: () => void;
}

// Decoy words for quiz options
const DECOY_WORDS = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
  'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
  'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
  'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
  'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
  'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album',
  'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone',
  'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among'
];

interface QuizQuestion {
  wordIndex: number;
  correctWord: string;
  options: string[];
}

/**
 * Seed Quiz Page - Verify user has backed up seed phrase
 */
function SeedQuizPage({ mnemonic, onBack, onComplete }: SeedQuizPageProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const words = useMemo(() => mnemonic.split(' '), [mnemonic]);
  const totalQuestions = 3;

  // Generate quiz questions
  const questions = useMemo<QuizQuestion[]>(() => {
    const indices: number[] = [];
    while (indices.length < totalQuestions) {
      const idx = Math.floor(Math.random() * words.length);
      if (!indices.includes(idx)) {
        indices.push(idx);
      }
    }

    return indices.map(wordIndex => {
      const correctWord = words[wordIndex];
      
      // Get 3 random decoys that are different from correct word
      const decoys: string[] = [];
      while (decoys.length < 3) {
        const decoy = DECOY_WORDS[Math.floor(Math.random() * DECOY_WORDS.length)];
        if (decoy !== correctWord && !decoys.includes(decoy)) {
          decoys.push(decoy);
        }
      }

      // Shuffle options
      const options = [correctWord, ...decoys].sort(() => Math.random() - 0.5);

      return { wordIndex, correctWord, options };
    });
  }, [words]);

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  const handleSelect = (answer: string) => {
    if (selectedAnswer !== null) return; // Already answered

    setSelectedAnswer(answer);
    const correct = answer === currentQ.correctWord;
    setIsCorrect(correct);

    if (correct) {
      setCorrectCount(prev => prev + 1);
      
      // Auto-advance after delay
      setTimeout(() => {
        if (currentQuestion < totalQuestions - 1) {
          setCurrentQuestion(prev => prev + 1);
          setSelectedAnswer(null);
          setIsCorrect(null);
        } else {
          // Quiz complete
          onComplete();
        }
      }, 1000);
    }
  };

  const handleRetry = () => {
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Xác minh Seed Phrase</h1>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Câu hỏi {currentQuestion + 1}/{totalQuestions}</span>
          <span>{correctCount} đúng</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1">
        <div className="text-center mb-6">
          <p className="text-muted-foreground text-sm mb-2">Chọn từ đúng</p>
          <h2 className="text-2xl font-bold">
            Từ thứ <span className="text-primary">{currentQ.wordIndex + 1}</span> là gì?
          </h2>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-2 gap-3">
          {currentQ.options.map((option, index) => {
            let buttonClass = "h-14 text-base font-medium transition-all";
            
            if (selectedAnswer === option) {
              if (isCorrect) {
                buttonClass += " bg-success text-success-foreground hover:bg-success";
              } else {
                buttonClass += " bg-destructive text-destructive-foreground hover:bg-destructive";
              }
            } else if (selectedAnswer !== null && option === currentQ.correctWord) {
              // Show correct answer when wrong selected
              buttonClass += " bg-success/20 border-success";
            }

            return (
              <Button
                key={index}
                onClick={() => handleSelect(option)}
                variant={selectedAnswer === option ? "default" : "outline"}
                className={buttonClass}
                disabled={selectedAnswer !== null && selectedAnswer !== option}
              >
                {option}
                {selectedAnswer === option && isCorrect && (
                  <Check className="w-5 h-5 ml-2" />
                )}
                {selectedAnswer === option && !isCorrect && (
                  <X className="w-5 h-5 ml-2" />
                )}
              </Button>
            );
          })}
        </div>

        {/* Wrong Answer Actions */}
        {isCorrect === false && (
          <div className="mt-6 space-y-3">
            <p className="text-center text-destructive text-sm">
              Sai rồi! Từ đúng là "{currentQ.correctWord}"
            </p>
            <div className="flex gap-2">
              <Button
                onClick={onBack}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Xem lại seed
              </Button>
              <Button
                onClick={handleRetry}
                variant="secondary"
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Thử lại
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SeedQuizPage;
