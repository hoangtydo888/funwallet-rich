import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const CTA = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-3xl" />
      
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-sm">Miễn phí tạo ví</span>
        </div>
        
        <h2 className="font-heading text-4xl md:text-6xl font-bold mb-6">
          Sẵn sàng bước vào<br />
          <span className="gradient-text">thế giới Web3?</span>
        </h2>
        
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Tham gia cùng hàng ngàn người dùng đã tin tưởng FUN Wallet để quản lý tài sản số của họ. 
          Bắt đầu hành trình crypto của bạn ngay hôm nay.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="glow bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground px-8 py-6 text-lg rounded-xl">
            <Link to="/auth">
              Tạo ví miễn phí
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="glass-card border-border/50 hover:bg-muted/50 px-8 py-6 text-lg rounded-xl">
            <a href="https://docs.lovable.dev" target="_blank" rel="noopener noreferrer">
              Tìm hiểu thêm
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTA;
