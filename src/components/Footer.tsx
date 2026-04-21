import { Instagram, Phone, Shield, LogOut, LogIn } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BrandLogo } from "./BrandLogo";

export const Footer = () => {
  const { settings } = useSiteSettings();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const phoneDisplay = settings.whatsapp_number.replace(/^55/, "+55 ").replace(/(\d{2})(\d{4,5})(\d{4})$/, "$1 $2-$3");

  const handleAccountClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (user) {
      await signOut();
      toast.success("Você saiu da conta");
      navigate("/");
    } else {
      navigate("/auth");
    }
  };

  return (
    <footer id="sobre" className="bg-primary text-primary-foreground py-14">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <BrandLogo
                variant="icon"
                className="h-16 w-16 border-primary-foreground/20 shadow-md"
              />
              <div>
                <h3 className="font-heading text-2xl font-bold leading-tight">{settings.brand_name}</h3>
                <p className="text-xs opacity-70 uppercase tracking-widest">{settings.brand_tagline}</p>
              </div>
            </div>
            <p className="text-sm opacity-80 leading-relaxed max-w-md">
              {settings.footer_about}
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-heading text-lg font-semibold">Navegação</h4>
            <div className="w-10 h-0.5 bg-primary-foreground/30 rounded-full" />
            <ul className="space-y-2 text-sm opacity-80">
              <li><a href="/" className="hover:opacity-100 transition-opacity">Início</a></li>
              <li><a href="#produtos" className="hover:opacity-100 transition-opacity">Produtos</a></li>
              <li><a href="#sobre" className="hover:opacity-100 transition-opacity">Sobre</a></li>
              <li>
                <button
                  type="button"
                  onClick={handleAccountClick}
                  className="hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 text-left"
                >
                  {user ? (
                    <><LogOut className="h-3 w-3" /> Sair da conta</>
                  ) : (
                    <><LogIn className="h-3 w-3" /> Entrar / Criar conta</>
                  )}
                </button>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-heading text-lg font-semibold">Contato</h4>
            <div className="w-10 h-0.5 bg-primary-foreground/30 rounded-full" />
            <ul className="space-y-2 text-sm opacity-80">
              <li>
                <a href={`https://wa.me/${settings.whatsapp_number}`} target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity inline-flex items-center gap-2">
                  <Phone className="h-3 w-3" /> {phoneDisplay}
                </a>
              </li>
              <li>
                <a href={`https://instagram.com/${settings.instagram_handle}`} target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity inline-flex items-center gap-2">
                  <Instagram className="h-3 w-3" /> @{settings.instagram_handle}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary-foreground/20 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs opacity-60">
          <span>&copy; {new Date().getFullYear()} {settings.brand_name}. Todos os direitos reservados.</span>
          <span className="inline-flex items-center gap-1.5">
            <Shield className="h-3 w-3" /> Site protegido com criptografia ponta a ponta
          </span>
        </div>
      </div>
    </footer>
  );
};
