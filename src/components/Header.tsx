import { Link } from "react-router-dom";
import { CartDrawer } from "./CartDrawer";
import logoIcon from "@/assets/logo-icon.jpg";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoIcon} alt="Traçando Memórias" className="h-10 w-10 rounded-full object-cover" />
          <span className="font-heading text-xl font-bold text-primary tracking-tight">
            Traçando Memórias
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Início
          </Link>
          <a href="#produtos" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Produtos
          </a>
          <a href="#sobre" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Sobre
          </a>
        </nav>
        <CartDrawer />
      </div>
    </header>
  );
};
