import { forwardRef } from "react";
import { MessageCircle } from "lucide-react";

export const WhatsAppButton = forwardRef<HTMLAnchorElement>((_, ref) => {
  return (
    <a
      ref={ref}
      href="https://wa.me/558287060860"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fale conosco no WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[hsl(142,70%,40%)] px-5 py-3.5 text-white shadow-lg hover:brightness-110 transition-all hover:scale-105"
    >
      <MessageCircle className="h-6 w-6 fill-current" />
      <span className="hidden sm:inline font-medium text-sm">WhatsApp</span>
    </a>
  );
});
WhatsAppButton.displayName = "WhatsAppButton";
