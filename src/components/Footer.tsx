import logoFull from "@/assets/logo-full.jpg";

export const Footer = () => {
  return (
    <footer id="sobre" className="bg-primary text-primary-foreground py-12">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <img src={logoFull} alt="Traçando Memórias - afetivas & especiais" className="h-20 w-auto rounded-lg" />
            <p className="text-sm opacity-80 leading-relaxed">
              Transformamos seus momentos mais especiais em peças personalizadas e únicas.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-heading text-lg font-semibold">Navegação</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><a href="#" className="hover:opacity-100 transition-opacity">Início</a></li>
              <li><a href="#produtos" className="hover:opacity-100 transition-opacity">Produtos</a></li>
              <li><a href="#sobre" className="hover:opacity-100 transition-opacity">Sobre</a></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="font-heading text-lg font-semibold">Contato</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li>contato@tracandoms.com</li>
              <li>Instagram: @tracandomemorias</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary-foreground/20 mt-8 pt-6 text-center text-sm opacity-60">
          &copy; {new Date().getFullYear()} Traçando Memórias. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
};
