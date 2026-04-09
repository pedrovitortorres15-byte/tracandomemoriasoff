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
        <div className="absolute inset-0 bg-gradient-to-r from-olive-900/85 via-olive-800/65 to-transparent" />
      </div>
      <div className="container relative z-10 py-20 md:py-32 lg:py-40">
        <div className="max-w-xl space-y-6">
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-cream-50 leading-tight">
            Transformando momentos em memórias
          </h1>
          <p className="text-lg md:text-xl text-cream-200 leading-relaxed">
            Canecas e produtos personalizados feitos com carinho para eternizar suas histórias mais especiais.
          </p>
          <a
            href="#produtos"
            className="inline-flex items-center px-8 py-3.5 rounded-sm bg-accent text-accent-foreground font-semibold text-sm uppercase tracking-wider hover:brightness-95 transition-all shadow-lg"
          >
            Ver Produtos
          </a>
        </div>
      </div>
    </section>
  );
};
