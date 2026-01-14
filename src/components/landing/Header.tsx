import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
      <nav className="max-w-6xl mx-auto glass-card rounded-2xl px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img src="/logo.gif?v=1" alt="FUN Wallet" className="h-12 md:h-16 lg:h-20 w-auto logo-glow cursor-pointer" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <NavLinks />
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Đăng nhập</Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
              <Link to="/auth">Tạo ví</Link>
            </Button>
          </div>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden mt-2 mx-4 glass-card rounded-2xl p-6 animate-fade-in">
          <div className="flex flex-col gap-4">
            <NavLinks mobile onClose={() => setIsMenuOpen(false)} />
            <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
              <Button asChild variant="ghost" className="justify-start">
                <Link to="/auth" onClick={() => setIsMenuOpen(false)}>Đăng nhập</Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                <Link to="/auth" onClick={() => setIsMenuOpen(false)}>Tạo ví</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

const NavLinks = ({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) => {
  const links = [
    { href: "#features", label: "Tính năng" },
    { href: "#about", label: "Về chúng tôi" },
    { href: "#faq", label: "FAQ" },
  ];

  const baseClass = mobile
    ? "text-foreground hover:text-primary transition-colors py-2"
    : "text-muted-foreground hover:text-foreground transition-colors text-sm";

  return (
    <>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className={baseClass}
          onClick={onClose}
        >
          {link.label}
        </a>
      ))}
    </>
  );
};

export default Header;
