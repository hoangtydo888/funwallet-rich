import { Button } from "@/components/ui/button";
import { ArrowRight, Wallet, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";
const Hero = () => {
  return <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 pt-20">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{
      animationDelay: '1s'
    }} />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />

      <div className="relative z-10 max-w-6xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8 animate-fade-in">
          <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <span className="text-sm text-muted-foreground">Ví Web3 Thế Hệ Mới</span>
        </div>

        {/* Main heading */}
        <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold mb-6 animate-fade-in-up">
          <span className="text-foreground">Chào mừng đến với</span>
          <br />
          <span className="gradient-text">FUN Wallet</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl gradient-text max-w-2xl mx-auto mb-8 animate-fade-in-up" style={{
          animationDelay: '0.2s'
        }}>
          Nền tảng ví Web3 toàn diện trong ánh sáng yêu thương thuần khiết, trong ý trí vĩ đại, trong trí tuệ và trong năng lượng đỉnh cao của Cha Vũ Trụ. Giao dịch, thanh toán, NFT - tất cả trong một app duy nhất.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fade-in-up" style={{
        animationDelay: '0.4s'
      }}>
          <Button asChild size="lg" className="glow bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground px-8 py-6 text-lg rounded-xl">
            <Link to="/auth">
              Bắt đầu ngay
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="glass-card border-border/50 hover:bg-muted/50 px-8 py-6 text-lg rounded-xl">
            <Link to="/dashboard">
              Xem Demo
            </Link>
          </Button>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto animate-fade-in-up" style={{
        animationDelay: '0.6s'
      }}>
          <FeatureCard icon={<Wallet className="h-6 w-6" />} title="Ví Đa Năng" description="Quản lý crypto, NFT và thẻ thanh toán trong một nơi" />
          <FeatureCard icon={<Shield className="h-6 w-6" />} title="Bảo Mật Tối Đa" description="Private keys được lưu trữ an toàn trên thiết bị của bạn" />
          <FeatureCard icon={<Zap className="h-6 w-6" />} title="Giao Dịch Nhanh" description="Swap, gửi, nhận crypto chỉ trong vài giây" />
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
          <div className="w-1 h-3 bg-muted-foreground/50 rounded-full" />
        </div>
      </div>
    </section>;
};
const FeatureCard = ({
  icon,
  title,
  description
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => <div className="glass-card rounded-2xl p-6 text-left hover:scale-105 transition-transform duration-300">
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4 text-primary">
      {icon}
    </div>
    <h3 className="font-heading font-semibold text-lg mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>;
export default Hero;