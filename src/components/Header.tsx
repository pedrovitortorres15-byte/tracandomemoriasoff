import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CartDrawer } from "./CartDrawer";
import { Search, User, Shield } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";
import logoIconFallback from "@/assets/logo-icon.jpg";

const CATEGORIES: { label: string; value: string }[] = [
  { label: "Início", value: "" },
  { label: "Todos", value: "todos" },
  { label: "Canecas", value: "canecas" },
  { label: "Presentes", value: "presentes" },
  { label: "Personalizados", value: "personalizados" },
];

export const Header = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { user, isAdmin } = useAuth();
  const { settings } = useSiteSettings();
  const OWNER_EMAIL = "catharinaferrario@gmail.com";
  const isOwner = isAdmin && user?.email?.toLowerCase() === OWNER_EMAIL;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeCat = searchParams.get("cat") || "";
  const logoSrc = settings.logo_url || logoIconFallback;
  const [brandFirst, ...brandRest] = settings.brand_name.split(" ");
  const brandMiddle = brandRest.length > 1 ? brandRest.slice(0, -1).join(" ") + " " : "";
  const brandLast = brandRest.length > 0 ? brandRest[brandRest.length - 1] : "";

  const goCategory = (value: string) => {
    if (!value) {
      navigate("/");
    } else {
      navigate(`/?cat=${encodeURIComponent(value)}#produtos`);
      setTimeout(() => {
        document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (q) {
      navigate(`/?q=${encodeURIComponent(q)}#produtos`);
      setTimeout(() => document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-beige-50/95 backdrop-blur-md shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3" aria-label={`${settings.brand_name} - Início`}>
          <img src={logoSrc} alt={`Logo ${settings.brand_name}`} className="h-11 w-11 rounded-full object-cover border-2 border-primary/20 shadow-sm" />
          <span className="font-heading text-base md:text-xl font-bold text-primary tracking-tight">
            {brandLast ? (
              <>{brandFirst} <span className="hidden sm:inline">{brandMiddle}</span>{brandLast}</>
            ) : (
              settings.brand_name
            )}
          </span>
        </Link>

        <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Pesquisar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 rounded-full border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Pesquisar">
              <Search className="h-4 w-4" />
            </button>
          </div>
        </form>

        <div className="flex items-center gap-2">
          <button className="md:hidden text-foreground" onClick={() => setSearchOpen(!searchOpen)} aria-label="Abrir busca">
            <Search className="h-5 w-5" />
          </button>
          {isOwner && (
            <Link to="/admin" aria-label="Painel da dona">
              <Button variant="ghost" size="icon" className="rounded-full text-primary" title="Painel da dona">
                <Shield className="h-5 w-5" />
              </Button>
            </Link>
          )}
          <Link to={user ? "/" : "/auth"} aria-label={user ? "Conta" : "Entrar"}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
            </Button>
          </Link>
          <CartDrawer />
        </div>
      </div>

      {searchOpen && (
        <form onSubmit={submitSearch} className="md:hidden px-4 pb-3">
          <input
            type="text"
            placeholder="Pesquisar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 rounded-full border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </form>
      )}

      <nav className="border-t border-border/60 bg-beige-50/80 backdrop-blur-sm">
        <div className="container flex items-center justify-between overflow-x-auto">
          <div className="flex items-center gap-1">
            {CATEGORIES.map((cat) => {
              const isActive =
                activeCat === cat.value ||
                (cat.value === "" && !activeCat && typeof window !== "undefined" && window.location.pathname === "/");
              return (
                <button
                  key={cat.label}
                  onClick={() => goCategory(cat.value)}
                  className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-full transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/70 hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
          <div className="hidden lg:flex items-center gap-1">
            <a
              href={`https://wa.me/${settings.whatsapp_number}`}
              target="_blank"
              rel="noopener"
              className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-foreground/70 hover:text-primary hover:bg-primary/5 rounded-full transition-all whitespace-nowrap"
            >
              Contato
            </a>
          </div>
        </div>
      </nav>
    </header>
  );
};
