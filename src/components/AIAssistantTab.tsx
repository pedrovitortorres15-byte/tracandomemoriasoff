import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Sparkles, Send, ImagePlus, X, Loader2, Trash2, Lightbulb, Mic, MicOff, Wand2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ToolEvent {
  name: string;
  args: any;
  result: any;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  images?: string[]; // data URLs
  toolEvents?: ToolEvent[];
}

const QUICK_PROMPTS = [
  { icon: "🎨", label: "Mudar cor da loja", prompt: "Quero deixar o site com uma vibe mais romântica em tons de rosa antigo. Pode ajustar a cor primária e o accent pra mim?" },
  { icon: "📸", label: "Legenda + hashtags", prompt: "Crie 3 versões de legenda envolvente para Instagram sobre uma caixa personalizada de presente, com hashtags estratégicas e CTA." },
  { icon: "🎬", label: "Roteiro de Reels", prompt: "Crie um roteiro de Reels de 30 segundos com hook forte mostrando o passo a passo de uma encomenda personalizada. Inclua sugestão de áudio em alta." },
  { icon: "🎁", label: "Criar campanha", prompt: "Crie uma campanha de Dia das Mães na loja com data limite de pedido e me sugira 3 produtos pra vincular nela." },
];

const STORAGE_KEY = "admin-ai-chat-history";

export const AIAssistantTab = () => {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef<string>("");

  // Inicia/encerra a gravação de voz (Web Speech API — sem custo, em pt-BR)
  const toggleRecording = () => {
    if (recording) {
      recognitionRef.current?.stop();
      return;
    }
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Seu navegador não suporta gravação por voz. Use Chrome ou Edge.");
      return;
    }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;
    baseTextRef.current = input ? input.trim() + " " : "";

    rec.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (finalText) baseTextRef.current += finalText + " ";
      setInput((baseTextRef.current + interimText).trimStart());
    };
    rec.onerror = (e: any) => {
      console.error("speech error", e);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        toast.error("Permissão do microfone negada. Habilite nas configurações do navegador.");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        toast.error("Erro na gravação de voz.");
      }
      setRecording(false);
    };
    rec.onend = () => setRecording(false);
    rec.onstart = () => setRecording(true);

    try {
      rec.start();
      recognitionRef.current = rec;
    } catch (e) {
      console.error(e);
      toast.error("Não consegui iniciar a gravação.");
    }
  };

  // Para a gravação ao desmontar
  useEffect(() => () => recognitionRef.current?.stop(), []);

  useEffect(() => {
    try {
      // Salva últimas 50 mensagens (sem as imagens base64 para não estourar storage)
      const slim = messages.slice(-50).map((m) => ({ ...m, images: m.images ? ["[imagem]"] : undefined }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    } catch {
      // ignore quota errors
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 4 - pendingImages.length);
    for (const f of arr) {
      if (f.size > 8 * 1024 * 1024) {
        toast.error(`${f.name} é muito grande (máx 8MB).`);
        continue;
      }
      const isImage = f.type.startsWith("image/");
      const isVideo = f.type.startsWith("video/");
      if (!isImage && !isVideo) {
        toast.error(`${f.name} não é imagem nem vídeo.`);
        continue;
      }
      if (isVideo) {
        // Para vídeo, capturamos um frame como imagem para a IA analisar.
        try {
          const frame = await captureVideoFrame(f);
          setPendingImages((prev) => [...prev, frame]);
          toast.success(`Frame de "${f.name}" pronto para análise.`);
        } catch {
          toast.error("Não consegui ler o vídeo. Tente uma imagem.");
        }
      } else {
        const dataUrl = await fileToDataUrl(f);
        setPendingImages((prev) => [...prev, dataUrl]);
      }
    }
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text && pendingImages.length === 0) return;
    if (loading) return;

    const userMsg: Message = {
      role: "user",
      content: text || "Analise para mim.",
      images: pendingImages.length > 0 ? [...pendingImages] : undefined,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setPendingImages([]);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Faça login como administradora para usar a IA.");
        setLoading(false);
        return;
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: newMessages.map(({ role, content, images }) => ({ role, content, images })),
        }),
      });

      if (resp.status === 429) { toast.error("Muitas requisições. Aguarde alguns instantes."); setLoading(false); return; }
      if (resp.status === 402) { toast.error("Créditos da IA esgotados. Adicione créditos no workspace."); setLoading(false); return; }
      if (resp.status === 401 || resp.status === 403) {
        const err = await resp.json().catch(() => ({}));
        toast.error(err.error || "Acesso restrito.");
        setLoading(false);
        return;
      }

      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data) {
        toast.error(data?.error || "Erro ao falar com a IA.");
        setLoading(false);
        return;
      }

      const toolEvents: ToolEvent[] = data.toolEvents || [];
      const writeTools = toolEvents.filter(
        (t) => !t.name.startsWith("list_") && !t.name.startsWith("get_") && t.result?.error == null,
      );
      if (writeTools.length > 0) {
        toast.success(`✨ ${writeTools.length} ação(ões) aplicadas no site`);
      }

      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.content || "✨",
        toolEvents: toolEvents.length > 0 ? toolEvents : undefined,
      }]);
    } catch (e) {
      console.error(e);
      toast.error("Falha de conexão com a IA.");
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (!confirm("Limpar toda a conversa?")) return;
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-primary/10 via-accent/10 to-background border rounded-lg p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-heading text-lg font-bold">Sua Assistente Pessoal de IA</h3>
          <p className="text-sm text-muted-foreground">
            Tô aqui pra te ajudar com posts, legendas, roteiros de Reels, ideias de campanha, respostas a clientes e tudo mais. Pode mandar fotos e até vídeos pra eu analisar! ✨
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} title="Limpar conversa">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Sugestões rápidas */}
      {messages.length === 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" /> Sugestões pra começar
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q.label}
                onClick={() => send(q.prompt)}
                className="text-left bg-card border rounded-lg p-3 hover:border-primary hover:bg-accent/5 transition-colors text-sm flex items-center gap-2"
              >
                <span className="text-lg">{q.icon}</span>
                <span className="font-medium">{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat */}
      <div className="bg-card border rounded-lg flex flex-col h-[60vh] min-h-[400px]">
        <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
          <div ref={scrollRef} className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-12">
                Comece uma conversa! Escreva uma pergunta ou clique numa sugestão acima.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                )}>
                  {m.images && m.images.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {m.images.map((img, idx) => (
                        img.startsWith("data:") ? (
                          <img key={idx} src={img} alt="" className="h-24 w-24 object-cover rounded-md" />
                        ) : (
                          <span key={idx} className="text-xs italic opacity-70">[imagem enviada]</span>
                        )
                      ))}
                    </div>
                  )}
                  {m.role === "assistant" ? (
                    <>
                      {m.toolEvents && m.toolEvents.length > 0 && (
                        <div className="mb-2 space-y-1">
                          {m.toolEvents.map((t, ti) => (
                            <div key={ti} className="flex items-center gap-1.5 text-[11px] bg-background/60 border rounded-md px-2 py-1">
                              <Wand2 className="h-3 w-3 text-primary" />
                              <span className="font-mono text-muted-foreground">{t.name}</span>
                              {t.result?.error ? (
                                <span className="text-destructive">· erro</span>
                              ) : (
                                <span className="text-green-600">· ok</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    </>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-2 justify-start">
                <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Pensando...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="border-t p-3 space-y-2">
          {pendingImages.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {pendingImages.map((img, idx) => (
                <div key={idx} className="relative">
                  <img src={img} alt="" className="h-16 w-16 object-cover rounded-md border" />
                  <button
                    onClick={() => setPendingImages((p) => p.filter((_, i) => i !== idx))}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
            />
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || pendingImages.length >= 4}
              title="Anexar foto ou vídeo"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Button
              variant={recording ? "default" : "outline"}
              size="icon"
              type="button"
              onClick={toggleRecording}
              disabled={loading}
              title={recording ? "Parar gravação" : "Gravar mensagem por voz"}
              className={cn(recording && "bg-destructive text-destructive-foreground hover:bg-destructive/90 animate-pulse")}
            >
              {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Pergunte qualquer coisa... (Enter envia, Shift+Enter pula linha)"
              rows={1}
              className="min-h-[40px] max-h-32 resize-none"
              disabled={loading}
            />
            <Button onClick={() => send()} disabled={loading || (!input.trim() && pendingImages.length === 0)}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            A IA pode cometer erros. Use o bom senso e revise sugestões antes de publicar.
          </p>
        </div>
      </div>
    </div>
  );
};

// ===== helpers =====

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Captura o primeiro frame visível de um vídeo como JPEG data URL. */
function captureVideoFrame(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadeddata = () => {
      // Tenta avançar 1s para pegar um frame mais representativo
      video.currentTime = Math.min(1, (video.duration || 1) / 2);
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      const maxSide = 1024;
      const ratio = video.videoWidth / video.videoHeight;
      canvas.width = ratio >= 1 ? maxSide : maxSide * ratio;
      canvas.height = ratio >= 1 ? maxSide / ratio : maxSide;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); return reject(new Error("no canvas")); }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(url);
      resolve(dataUrl);
    };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("video error")); };
  });
}
