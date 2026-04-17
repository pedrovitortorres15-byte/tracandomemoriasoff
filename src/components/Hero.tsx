import heroBg from "@/assets/hero-bg.jpg";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="Canecas personalizadas artesanais"
          className="w-full h-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brown-900/90 via-brown-800/70 to-transparent" />
      </div>
      <div className="container relative z-10 py-24 md:py-36 lg:py-44">
        <div class="max-w-xl space-y-8 animate-fade-in">
          <span className="inline-block text-xs uppercase tracking-[0.3em] text-beige-200 font-medium">
            Loja Traçando Memórias · Presentes que contam histórias
          </span>
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-beige-50 leading-tight">
            Transformando momentos em memórias
          </h1>
          <p className="text-lg md:text-xl text-beige-200 leading-relaxed max-w-lg">
            Canecas, caixas e produtos personalizados feitos à mão para eternizar suas histórias mais especiais.
          </p>
          <a
            href="#produtos"
            className="inline-flex items-center px-10 py-4 rounded-full bg-accent text-accent-foreground font-semibold text-sm uppercase tracking-wider hover:brightness-95 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            Ver Produtos
          </a>
        </div>
      </div>
    </section>
  );
};
