import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Sparkles, Send, ImagePlus, X, Loader2, Trash2, Lightbulb, Mic, MicOff, Wand2, Copy, Check, Plus, MessagesSquare, Pencil, MoreVertical } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ToolEvent {
  name: string;
  args: any;
  result: any;
}

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  images?: string[]; // data URLs
  toolEvents?: ToolEvent[];
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

const QUICK_PROMPTS = [
  { icon: "🎨", label: "Mudar cor da loja", prompt: "Quero deixar o site com uma vibe mais romântica em tons de rosa antigo. Pode ajustar a cor primária e o accent pra mim?" },
  { icon: "📸", label: "Legenda + hashtags", prompt: "Crie 3 versões de legenda envolvente para Instagram sobre uma caixa personalizada de presente, com hashtags estratégicas e CTA." },
  { icon: "🎬", label: "Roteiro de Reels", prompt: "Crie um roteiro de Reels de 30 segundos com hook forte mostrando o passo a passo de uma encomenda personalizada. Inclua sugestão de áudio em alta." },
  { icon: "🎁", label: "Criar campanha", prompt: "Crie uma campanha de Dia das Mães na loja com data limite de pedido e me sugira 3 produtos pra vincular nela." },
];

const ACTIVE_CONV_KEY = "admin-ai-active-conversation";

export const AIAssistantTab = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_CONV_KEY)
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef<string>("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const copyMessage = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      toast.success("Texto copiado!");
      setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 2000);
    } catch {
      toast.error("Não consegui copiar. Selecione e copie manualmente.");
    }
  };

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

  // ============ Histórico no banco ============
  const loadConversations = async () => {
    const { data, error } = await supabase
      .from("ai_conversations")
      .select("id,title,updated_at")
      .order("updated_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setConversations(data || []);
  };

  const loadMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from("ai_messages")
      .select("id,role,content,images,tool_events,created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setLoadingMessages(false);
    if (error) {
      console.error(error);
      toast.error("Não consegui carregar o histórico desta conversa.");
      return;
    }
    setMessages(
      (data || []).map((row: any) => ({
        id: row.id,
        role: row.role,
        content: row.content,
        images: row.images || undefined,
        toolEvents: row.tool_events || undefined,
      })),
    );
  };

  // Carrega lista ao montar e mensagens da conversa ativa
  useEffect(() => {
    (async () => {
      setLoadingHistory(true);
      await loadConversations();
      setLoadingHistory(false);
    })();
  }, []);

  useEffect(() => {
    if (activeId) {
      localStorage.setItem(ACTIVE_CONV_KEY, activeId);
      loadMessages(activeId);
    } else {
      localStorage.removeItem(ACTIVE_CONV_KEY);
      setMessages([]);
    }
  }, [activeId]);

  const ensureConversation = async (firstUserText: string): Promise<string | null> => {
    if (activeId) return activeId;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Faça login como administradora.");
      return null;
    }
    // Título inicial provisório (curto), será refinado pela IA depois da 1ª resposta.
    const provisional = firstUserText.trim().slice(0, 40) || "Nova conversa";
    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({ user_id: user.id, title: provisional })
      .select("id,title,updated_at")
      .single();
    if (error || !data) {
      console.error(error);
      toast.error("Não consegui criar a conversa.");
      return null;
    }
    setConversations((prev) => [data, ...prev]);
    setActiveId(data.id);
    return data.id;
  };

  /** Gera um título curto (3-6 palavras) usando a IA e atualiza no banco. */
  const summarizeTitle = async (conversationId: string, firstUserText: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "summarize_title", text: firstUserText }),
      });
      if (!r.ok) return;
      const { title } = await r.json();
      if (!title || typeof title !== "string") return;
      const cleanTitle = title.trim().slice(0, 60);
      await supabase.from("ai_conversations").update({ title: cleanTitle }).eq("id", conversationId);
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, title: cleanTitle } : c)),
      );
    } catch (e) {
      console.error("summarize title", e);
    }
  };

  const persistMessage = async (conversationId: string, msg: Message) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: msg.role,
      content: msg.content,
      images: msg.images && msg.images.length > 0 ? msg.images : null,
      tool_events: msg.toolEvents && msg.toolEvents.length > 0 ? (msg.toolEvents as any) : null,
    });
    // bump updated_at + reordena
    await supabase
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  };

  const newConversation = () => {
    setActiveId(null);
    setMessages([]);
    setInput("");
    setPendingImages([]);
    setSidebarOpen(false);
  };

  const renameConversation = async (id: string, currentTitle: string) => {
    const next = window.prompt("Novo nome da conversa:", currentTitle);
    if (!next || next.trim() === "" || next === currentTitle) return;
    const title = next.trim().slice(0, 80);
    const { error } = await supabase
      .from("ai_conversations")
      .update({ title })
      .eq("id", id);
    if (error) {
      toast.error("Não consegui renomear.");
      return;
    }
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    toast.success("Conversa renomeada.");
  };

  const deleteConversation = async (id: string) => {
    if (!confirm("Excluir esta conversa? Essa ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("ai_conversations").delete().eq("id", id);
    if (error) {
      toast.error("Não consegui excluir.");
      return;
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
    toast.success("Conversa excluída.");
  };

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
      // Detecta se essa é a primeira mensagem (para gerar o título resumido depois).
      const isFirstMessage = messages.length === 0 && !activeId;
      // Garante uma conversa criada antes de enviar
      const convId = await ensureConversation(userMsg.content);
      if (!convId) { setLoading(false); return; }
      // Persiste a mensagem do usuário em paralelo com a chamada à IA
      persistMessage(convId, userMsg).catch((e) => console.error("persist user", e));

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

      const assistantMsg: Message = {
        role: "assistant",
        content: data.content || "✨",
        toolEvents: toolEvents.length > 0 ? toolEvents : undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      persistMessage(convId, assistantMsg).catch((e) => console.error("persist assistant", e));
      // reordena a sidebar (move pra topo)
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === convId);
        if (idx === -1) return prev;
        const updated = { ...prev[idx], updated_at: new Date().toISOString() };
        return [updated, ...prev.filter((c) => c.id !== convId)];
      });
    } catch (e) {
      console.error(e);
      toast.error("Falha de conexão com a IA.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-primary/10 via-accent/10 to-background border rounded-lg p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-lg font-bold">Catha AI ✨ — sua copiloto criativa</h3>
          <p className="text-sm text-muted-foreground">
            Posso mudar cores e textos do site, criar produtos e campanhas, escrever legendas, roteiros, responder clientes e analisar suas fotos e vídeos. É só pedir — eu faço por você. 💝
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0 xl:hidden">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setSidebarOpen((s) => !s)}
            title="Histórico de conversas"
          >
            <MessagesSquare className="h-4 w-4" />
            <span className="text-[11px]">
              {sidebarOpen ? "Fechar" : "Histórico"}
              {conversations.length > 0 && ` (${conversations.length})`}
            </span>
          </Button>
        </div>
      </div>

      {/* Layout principal: sidebar + chat
          Em telas grandes (xl+) sidebar fica fixo ao lado.
          Em telas menores, sidebar é toggleável e ocupa a largura toda quando aberto. */}
      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">
        {/* Sidebar de histórico */}
        <aside
          className={cn(
            "bg-card border rounded-lg flex-col h-[65vh] min-h-[420px] xl:flex",
            sidebarOpen ? "flex" : "hidden xl:flex",
          )}
        >
          <div className="p-3 border-b flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Conversas
            </span>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={newConversation}>
              <Plus className="h-3.5 w-3.5" /> Nova
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {loadingHistory ? (
                <div className="text-xs text-muted-foreground text-center py-6 flex items-center justify-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-6 px-2">
                  Nenhuma conversa ainda. Comece uma agora! ✨
                </div>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      "group rounded-md flex items-center gap-1 px-1",
                      activeId === c.id ? "bg-primary/10" : "hover:bg-muted",
                    )}
                  >
                    <button
                      onClick={() => { setActiveId(c.id); setSidebarOpen(false); }}
                      className="flex-1 text-left px-2 py-2 text-sm truncate"
                      title={c.title}
                    >
                      <div className="truncate font-medium">{c.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(c.updated_at).toLocaleString("pt-BR", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                          title="Ações"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => renameConversation(c.id, c.title)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Renomear
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteConversation(c.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        <div className={cn("space-y-4", sidebarOpen && "hidden xl:block")}>

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
      <div className="bg-card border rounded-lg flex flex-col h-[65vh] min-h-[420px]">
        {/* Header do chat com nome da conversa ativa */}
        <div className="border-b px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs font-medium truncate">
              {activeId
                ? conversations.find((c) => c.id === activeId)?.title || "Conversa"
                : "Nova conversa"}
            </span>
          </div>
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs shrink-0" onClick={newConversation}>
            <Plus className="h-3.5 w-3.5" /> Nova
          </Button>
        </div>
        <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
          <div ref={scrollRef} className="space-y-4">
            {loadingMessages ? (
              <div className="text-center text-muted-foreground text-sm py-12 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando conversa...
              </div>
            ) : messages.length === 0 && (
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
                                <span className="text-primary">· ok</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                      {m.content && (
                        <div className="mt-2 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyMessage(m.content, i)}
                            className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                            title="Copiar resposta"
                          >
                            {copiedIdx === i ? (
                              <><Check className="h-3 w-3" /> Copiado</>
                            ) : (
                              <><Copy className="h-3 w-3" /> Copiar</>
                            )}
                          </Button>
                        </div>
                      )}
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
