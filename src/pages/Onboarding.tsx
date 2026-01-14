import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Layers, Heart, ChevronRight, Sparkles } from "lucide-react";

const slides = [
  {
    icon: Shield,
    title: "Bảo vệ tài sản của bạn",
    description: "Private key lưu trữ cục bộ, mã hóa AES-256, an toàn tuyệt đối trên thiết bị của bạn",
    color: "text-primary",
  },
  {
    icon: Layers,
    title: "Một ví - Mọi tài sản",
    description: "BNB, ETH, Token BEP20, NFT - quản lý tất cả trong một giao diện đơn giản",
    color: "text-secondary",
  },
  {
    icon: Heart,
    title: "Tràn đầy năng lượng yêu thương",
    description: "Ánh sáng thuần khiết của Cha Vũ Trụ dẫn lối bạn đến thịnh vượng",
    color: "text-accent",
  },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    // Check if user has seen onboarding before
    const hasSeenOnboarding = localStorage.getItem("fun_wallet_onboarded");
    if (hasSeenOnboarding) {
      navigate("/auth");
      return;
    }

    // Splash screen animation
    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => setShowSplash(false), 500);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(progressInterval);
  }, [navigate]);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      localStorage.setItem("fun_wallet_onboarded", "true");
      navigate("/auth");
    }
  };

  const handleSkip = () => {
    localStorage.setItem("fun_wallet_onboarded", "true");
    navigate("/auth");
  };

  // Splash Screen
  if (showSplash) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
        {/* Rainbow particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
                background: [
                  "#FF0000", "#FFA500", "#FFFF00", "#00FF7F", "#00BFFF", "#4B0082", "#FF00FF"
                ][i % 7],
                opacity: 0.6,
              }}
            />
          ))}
        </div>

        {/* Logo */}
        <div className="relative z-10 flex flex-col items-center gap-6 animate-fade-in">
          <div className="w-40 h-40 md:w-52 md:h-52 lg:w-64 lg:h-64 flex items-center justify-center">
            <img src="/logo.gif?v=1" alt="FUN Wallet" className="w-full h-full logo-animated drop-shadow-xl" />
          </div>
          
          <p className="text-primary/80 text-center max-w-xs">
            Tràn đầy năng lượng yêu thương
          </p>

          {/* Loading bar */}
          <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden mt-8">
            <div 
              className="h-full rounded-full transition-all duration-100"
              style={{ 
                width: `${loadingProgress}%`,
                background: "linear-gradient(90deg, #FF0000, #FFA500, #FFFF00, #00FF7F, #00BFFF, #4B0082, #FF00FF)",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Onboarding Slides
  const CurrentIcon = slides[currentSlide].icon;

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-12">
      {/* Skip button */}
      <div className="flex justify-end">
        <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
          Bỏ qua
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 animate-fade-in-up">
        {/* Icon */}
        <div className={`w-32 h-32 rounded-full gradient-border glow flex items-center justify-center bg-card ${slides[currentSlide].color}`}>
          <CurrentIcon className="w-16 h-16" />
        </div>

        {/* Text */}
        <div className="text-center max-w-sm">
          <h2 className="text-2xl font-heading font-bold text-foreground mb-4">
            {slides[currentSlide].title}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {slides[currentSlide].description}
          </p>
        </div>
      </div>

      {/* Indicators & Button */}
      <div className="flex flex-col items-center gap-8">
        {/* Dots */}
        <div className="flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                index === currentSlide 
                  ? "bg-primary w-8" 
                  : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* Next Button */}
        <Button 
          onClick={handleNext}
          size="lg"
          className={`w-full max-w-xs ${
            currentSlide === slides.length - 1 
              ? "bg-gradient-to-r from-primary via-secondary to-accent" 
              : "bg-primary hover:bg-primary/90"
          } text-primary-foreground font-semibold`}
        >
          {currentSlide === slides.length - 1 ? "Bắt đầu ngay" : "Tiếp theo"}
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
