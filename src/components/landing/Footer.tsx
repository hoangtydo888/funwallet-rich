import { Github, Twitter, MessageCircle } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-12 px-4 border-t border-border/50">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="mb-4">
              <img src="/logo.gif?v=1" alt="FUN Wallet" className="h-16 md:h-20 lg:h-28 w-auto logo-glow" />
            </div>
            <p className="text-muted-foreground mb-4 max-w-sm">
              Trái tim của FUN ECOSYSTEM - Hệ sinh thái 5D trong thời đại Hoàng Kim.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Sản phẩm</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Ví Web3</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Thẻ FUN Card</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">NFT Gallery</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Exchange</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold mb-4">Hỗ trợ</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Trung tâm hỗ trợ</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Tài liệu API</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Điều khoản</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Chính sách</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border/50 text-center text-muted-foreground text-sm">
          <p>© 2025 FUN Wallet. Thuộc FUN ECOSYSTEM.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
