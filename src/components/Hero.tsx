import { useSiteSettings } from "@/hooks/useSiteSettings";
import heroBgFallback from "@/assets/hero-bg.jpg";

export const Hero = () => {
  const { settings } = useSiteSettings();
  const bg = settings.hero_image_url || heroBgFallback;
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={bg}
          alt={settings.hero_title}
          className="w-full h-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brown-900/90 via-brown-800/70 to-transparent md:bg-gradient-to-r" />
        <div className="md:hidden absolute inset-0 bg-gradient-to-b from-brown-900/80 via-brown-900/60 to-brown-900/80" />
      </div>
      <div className="container relative z-10 py-14 sm:py-20 md:py-36 lg:py-44">
        <div className="max-w-xl space-y-4 md:space-y-8 animate-fade-in text-center md:text-left mx-auto md:mx-0">
          <span className="inline-block text-[10px] md:text-xs uppercase tracking-[0.3em] text-beige-200 font-medium">
            {settings.hero_eyebrow}
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-beige-50 leading-tight">
            {settings.hero_title}
          </h1>
          <p className="text-sm sm:text-base md:text-xl text-beige-200 leading-relaxed max-w-lg mx-auto md:mx-0">
            {settings.hero_subtitle}
          </p>
          <a
            href="#produtos"
            className="inline-flex items-center px-7 py-3 md:px-10 md:py-4 rounded-full bg-accent text-accent-foreground font-semibold text-xs md:text-sm uppercase tracking-wider hover:brightness-95 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            {settings.hero_cta_text}
          </a>
        </div>
      </div>
    </section>
  );
};
