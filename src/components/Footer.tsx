import logoFull from "@/assets/logo-full.jpg";
import { Instagram, Phone, Shield } from "lucide-react";

export const Footer = () => {
  return (
    <footer id="sobre" className="bg-primary text-primary-foreground py-14">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <img src={logoFull} alt="Logo Loja Traçando Memórias" className="h-16 w-16 rounded-full shadow-md object-cover border-2 border-primary-foreground/20" />
              <div>
                <h3 className="font-heading text-2xl font-bold leading-tight">Loja Traçando Memórias</h3>
                <p className="text-xs opacity-70 uppercase tracking-widest">Presentes feitos à mão</p>
              </div>
            </div>
            <p className="text-sm opacity-80 leading-relaxed max-w-md">
              Transformamos seus momentos mais especiais em peças personalizadas e únicas. Cada produto é criado com amor e dedicação.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-heading text-lg font-semibold">Navegação</h4>
            <div className="w-10 h-0.5 bg-primary-foreground/30 rounded-full" />
            <ul className="space-y-2 text-sm opacity-80">
              <li><a href="/" className="hover:opacity-100 transition-opacity">Início</a></li>
              <li><a href="#produtos" className="hover:opacity-100 transition-opacity">Produtos</a></li>
              <li><a href="#sobre" className="hover:opacity-100 transition-opacity">Sobre</a></li>
              <li><a href="/auth" className="hover:opacity-100 transition-opacity">Minha conta</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-heading text-lg font-semibold">Contato</h4>
            <div className="w-10 h-0.5 bg-primary-foreground/30 rounded-full" />
            <ul className="space-y-2 text-sm opacity-80">
              <li>
                <a href="https://wa.me/558287060860" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity inline-flex items-center gap-2">
                  <Phone className="h-3 w-3" /> +55 82 8706-0860
                </a>
              </li>
              <li className="inline-flex items-center gap-2">
                <Instagram className="h-3 w-3" /> @tracandomemorias
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary-foreground/20 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs opacity-60">
          <span>&copy; {new Date().getFullYear()} Loja Traçando Memórias. Todos os direitos reservados.</span>
          <span className="inline-flex items-center gap-1.5">
            <Shield className="h-3 w-3" /> Site protegido com criptografia ponta a ponta
          </span>
        </div>
      </div>
    </footer>
  );
};
