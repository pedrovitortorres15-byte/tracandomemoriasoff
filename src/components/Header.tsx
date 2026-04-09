import { Link } from "react-router-dom";
import { CartDrawer } from "./CartDrawer";
import { Search } from "lucide-react";
import { useState } from "react";
import logoIcon from "@/assets/logo-icon.jpg";

export const Header = () => {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-beige-50/95 backdrop-blur-md shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoIcon} alt="Traçando Memórias" className="h-11 w-11 rounded-full object-cover border-2 border-primary/20 shadow-sm" />
          <span className="font-heading text-xl md:text-2xl font-bold text-primary tracking-tight hidden sm:block">
            Traçando Memórias
          </span>
        </Link>

        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Pesquisar produtos..."
              className="w-full pl-4 pr-10 py-2.5 rounded-full border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="md:hidden text-foreground" onClick={() => setSearchOpen(!searchOpen)}>
            <Search className="h-5 w-5" />
          </button>
          <CartDrawer />
        </div>
      </div>

      {searchOpen && (
        <div className="md:hidden px-4 pb-3">
          <input
            type="text"
            placeholder="Pesquisar produtos..."
            className="w-full pl-4 pr-10 py-2.5 rounded-full border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}

      <nav className="border-t border-border/60 bg-beige-50/80 backdrop-blur-sm">
        <div className="container flex items-center justify-between overflow-x-auto">
          <div className="flex items-center gap-1">
            {["Início", "Todos", "Canecas", "Presentes", "Personalizados"].map((cat) => (
              <a
                key={cat}
                href={cat === "Início" ? "/" : "#produtos"}
                className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-foreground/70 hover:text-primary hover:bg-primary/5 rounded-full transition-all whitespace-nowrap"
              >
                {cat}
              </a>
            ))}
          </div>
          <div className="hidden lg:flex items-center gap-1">
            {["Contato", "Sobre"].map((item) => (
              <a
                key={item}
                href={item === "Contato" ? "https://wa.me/558287060860" : "#sobre"}
                target={item === "Contato" ? "_blank" : undefined}
                className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-foreground/70 hover:text-primary hover:bg-primary/5 rounded-full transition-all whitespace-nowrap"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
};
