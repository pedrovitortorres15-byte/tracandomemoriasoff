import { Instagram } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export function InstagramButton() {
  const { settings } = useSiteSettings();
  const handle = (settings.instagram_handle || "lojatracandomemorias")
    .replace(/^@/, "")
    .trim();
  const href = `https://www.instagram.com/${handle}/`;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Visite nosso Instagram @${handle}`}
      className="fixed bottom-40 right-4 sm:bottom-[5.5rem] sm:right-6 z-30 flex items-center gap-2 rounded-full px-4 py-3 sm:px-5 sm:py-3.5 text-white shadow-lg transition-all hover:brightness-110 hover:scale-105"
      style={{
        background:
          "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
      }}
    >
      <Instagram className="h-5 w-5 sm:h-6 sm:w-6" />
      <span className="hidden sm:inline font-medium text-sm">Instagram</span>
    </a>
  );
}
