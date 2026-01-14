import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Layers, Heart, ChevronRight, Sparkles, Star } from "lucide-react";

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

// Rainbow colors for particles
const rainbowColors = [
  "#FF0000", "#FF4500", "#FFA500", "#FFD700", "#FFFF00", 
  "#ADFF2F", "#00FF7F", "#00FA9A", "#00FFFF", "#00BFFF", 
  "#1E90FF", "#4B0082", "#8B00FF", "#FF00FF", "#FF1493"
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [logoLoaded, setLogoLoaded] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding before
    const hasSeenOnboarding = localStorage.getItem("fun_wallet_onboarded");
    if (hasSeenOnboarding) {
      navigate("/auth");
      return;
    }

    // Trigger logo animation after a small delay
    setTimeout(() => setLogoLoaded(true), 100);

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

  // Splash Screen with enhanced animations
  if (showSplash) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
        {/* Animated pulse rings behind logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <div
              key={`ring-${i}`}
              className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full border-2 border-primary/20 animate-pulse-ring"
              style={{
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}
        </div>

        {/* Orbiting rainbow particles */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={`orbit-${i}`}
              className="absolute w-3 h-3 rounded-full animate-orbit"
              style={{
                background: rainbowColors[i % rainbowColors.length],
                boxShadow: `0 0 10px ${rainbowColors[i % rainbowColors.length]}`,
                '--orbit-radius': `${120 + (i % 3) * 30}px`,
                '--orbit-duration': `${6 + i * 0.5}s`,
                '--orbit-delay': `${i * 0.3}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Floating sparkles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={`sparkle-${i}`}
              className="absolute animate-twinkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                '--twinkle-duration': `${2 + Math.random() * 2}s`,
                '--twinkle-delay': `${Math.random() * 3}s`,
              } as React.CSSProperties}
            >
              <Star 
                className="text-yellow-400" 
                size={8 + Math.random() * 12} 
                fill="currentColor"
                style={{
                  filter: `drop-shadow(0 0 4px rgba(255, 215, 0, 0.8))`,
                }}
              />
            </div>
          ))}
        </div>

        {/* Rainbow floating particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={`particle-${i}`}
              className="absolute rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${4 + Math.random() * 8}px`,
                height: `${4 + Math.random() * 8}px`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${4 + Math.random() * 4}s`,
                background: rainbowColors[i % rainbowColors.length],
                boxShadow: `0 0 8px ${rainbowColors[i % rainbowColors.length]}`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>

        {/* Logo with scale bounce animation */}
        <div className={`relative z-10 flex flex-col items-center gap-6 ${logoLoaded ? 'animate-scale-bounce' : 'opacity-0'}`}>
          <div className="w-40 h-40 md:w-52 md:h-52 lg:w-64 lg:h-64 flex items-center justify-center">
            <img 
              src="/logo.gif?v=1" 
              alt="FUN Wallet" 
              className="w-full h-full logo-animated drop-shadow-xl glow-rainbow" 
            />
          </div>
          
          {/* Text with reveal animation */}
          <p className="text-primary/80 text-center max-w-xs animate-text-reveal font-medium">
            ✨ Tràn đầy năng lượng yêu thương ✨
          </p>

          {/* Loading bar with glow and shimmer */}
          <div className="w-48 h-2 bg-muted rounded-full overflow-hidden mt-8 relative loading-bar-glow">
            <div 
              className="h-full rounded-full transition-all duration-100 relative overflow-hidden loading-shimmer"
              style={{ 
                width: `${loadingProgress}%`,
                background: "linear-gradient(90deg, #FF0000, #FFA500, #FFFF00, #00FF7F, #00BFFF, #4B0082, #FF00FF)",
              }}
            />
          </div>
          
          {/* Loading percentage */}
          <span className="text-xs text-muted-foreground animate-pulse">
            {loadingProgress}%
          </span>
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
