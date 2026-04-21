import { MessageCircle } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const sanitizePhone = (n: string) => (n || "").replace(/\D/g, "");

export function WhatsAppButton() {
  const { settings } = useSiteSettings();
  const phone = sanitizePhone(settings.whatsapp_number) || "558287060860";
  const href = `https://api.whatsapp.com/send?phone=${phone}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fale conosco no WhatsApp"
      className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-30 flex items-center gap-2 rounded-full bg-pay-pix px-4 py-3 sm:px-5 sm:py-3.5 text-pay-pix-foreground shadow-lg transition-all hover:brightness-110 hover:scale-105"
    >
      <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 fill-current" />
      <span className="hidden sm:inline font-medium text-sm">WhatsApp</span>
    </a>
  );
}
