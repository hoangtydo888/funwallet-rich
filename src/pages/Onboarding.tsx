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
        {/* Animated pulse rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border-2 border-primary/30 animate-ring-pulse"
              style={{
                width: `${180 + i * 80}px`,
                height: `${180 + i * 80}px`,
                animationDelay: `${i * 0.8}s`,
              }}
            />
          ))}
        </div>

        {/* Sparkle stars around logo */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => {
            const angle = (i * 45) * Math.PI / 180;
            const radius = 140;
            return (
              <Star
                key={i}
                className="absolute w-4 h-4 text-yellow-400 fill-yellow-400 animate-sparkle"
                style={{
                  left: `calc(50% + ${Math.cos(angle) * radius}px - 8px)`,
                  top: `calc(50% + ${Math.sin(angle) * radius}px - 8px)`,
                  animationDelay: `${i * 0.25}s`,
                }}
              />
            );
          })}
        </div>

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

        {/* Logo with zoom-in + breathing glow */}
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div 
            className="w-44 h-44 md:w-56 md:h-56 lg:w-72 lg:h-72 flex items-center justify-center animate-zoom-in"
          >
            <img 
              src="/logo.gif?v=1" 
              alt="FUN Wallet" 
              className="w-full h-full animate-breathing-glow"
              style={{ 
                filter: 'drop-shadow(0 0 30px rgba(0, 255, 127, 0.6))'
              }} 
            />
          </div>
          
          {/* Animated tagline */}
          <p 
            className="text-primary/90 text-center max-w-xs font-medium text-lg animate-fade-in-up"
            style={{ animationDelay: '0.6s' }}
          >
            ✨ Tràn đầy năng lượng yêu thương ✨
          </p>

          {/* Loading bar with shimmer */}
          <div className="w-56 h-2 bg-muted rounded-full overflow-hidden mt-6 relative">
            <div 
              className="h-full rounded-full transition-all duration-100 relative loading-shimmer"
              style={{ 
                width: `${loadingProgress}%`,
                background: "linear-gradient(90deg, #FF0000, #FFA500, #FFFF00, #00FF7F, #00BFFF, #4B0082, #FF00FF)",
              }}
            />
          </div>
          
          {/* Loading percentage */}
          <p className="text-muted-foreground text-sm animate-pulse">
            {loadingProgress}%
          </p>
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
