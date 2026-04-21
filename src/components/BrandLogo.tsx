import { useSiteSettings } from "@/hooks/useSiteSettings";
import logoIconFallback from "@/assets/logo-icon.jpg";
import logoFullFallback from "@/assets/logo-full.jpg";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  variant?: "icon" | "full";
  /** Tailwind size classes for the image (default: h-10 w-10 / h-12 w-auto) */
  className?: string;
  /** If true, also renders the brand name next to the logo */
  showName?: boolean;
  nameClassName?: string;
  /** Wrapper className */
  wrapperClassName?: string;
}

/**
 * Logo da marca, reutilizável em todo o site.
 * - variant="icon" → logo redonda (header, drawer, dialogs)
 * - variant="full" → logo completa (footer, hero, auth, admin)
 * Faz fallback automático se a logo personalizada não tiver sido enviada.
 */
export const BrandLogo = ({
  variant = "icon",
  className,
  showName = false,
  nameClassName,
  wrapperClassName,
}: BrandLogoProps) => {
  const { settings } = useSiteSettings();
  const fallback = variant === "full" ? logoFullFallback : logoIconFallback;
  const src =
    variant === "full"
      ? settings.logo_full_url || settings.logo_url || fallback
      : settings.logo_url || settings.logo_full_url || fallback;

  const baseClass =
    variant === "full"
      ? "h-12 w-auto object-contain drop-shadow-sm"
      : "h-10 w-10 rounded-full object-cover border-2 border-primary/20 shadow-sm";

  return (
    <span className={cn("inline-flex items-center gap-2.5", wrapperClassName)}>
      <img
        src={src}
        alt={`Logo ${settings.brand_name}`}
        className={cn(baseClass, className)}
        loading="lazy"
        decoding="async"
      />
      {showName && (
        <span
          className={cn(
            "font-heading font-bold text-primary tracking-tight leading-tight",
            nameClassName
          )}
        >
          {settings.brand_name}
        </span>
      )}
    </span>
  );
};
