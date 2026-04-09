import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Bot, User, Image as ImageIcon, FileText, Video } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  images?: string[];
}

const SUGGESTIONS = [
  "Crie um roteiro para um vídeo de 30s mostrando canecas personalizadas",
  "Escreva uma legenda para post do Instagram sobre canecas de família",
  "Sugira 5 ideias de produtos personalizados para o Dia das Mães",
  "Crie uma descrição atrativa para uma caneca personalizada com foto",
  "Monte um roteiro de fotos para catálogo de produtos",
];

export default function AdminAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: messageText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { messages: newMessages.map((m) => ({ role: m.role, content: m.content })) },
      });

      if (error) throw error;

      setMessages([...newMessages, { role: "assistant", content: data.content }]);
    } catch (e: any) {
      toast.error("Erro ao conectar com a IA");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const generateImage = async () => {
    if (!imagePrompt.trim() || generatingImage) return;
    setGeneratingImage(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-image", {
        body: { prompt: imagePrompt },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: `🖼️ Gerar imagem: ${imagePrompt}` },
          { role: "assistant", content: "Aqui está a imagem gerada:", images: [data.imageUrl] },
        ]);
        setImagePrompt("");
      }
    } catch (e: any) {
      toast.error("Erro ao gerar imagem");
      console.error(e);
    } finally {
      setGeneratingImage(false);
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)]">
      <h2 className="text-2xl font-heading font-bold text-foreground">Assistente IA</h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100%-3rem)]">
        {/* Chat area */}
        <div className="lg:col-span-3 flex flex-col">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                Chat com IA - Traçando Memórias
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 p-4">
              <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">Olá! Sou seu assistente para a Traçando Memórias.</p>
                    <p className="text-sm text-muted-foreground mb-6">Posso ajudar com roteiros, descrições, ideias e muito mais!</p>
                    <div className="flex flex-wrap gap-2 max-w-lg justify-center">
                      {SUGGESTIONS.map((s, i) => (
                        <Button key={i} variant="outline" size="sm" className="text-xs" onClick={() => sendMessage(s)}>
                          {s.length > 50 ? s.slice(0, 50) + "..." : s}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                        {msg.role === "assistant" && (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          {msg.role === "assistant" ? (
                            <div className="prose prose-sm max-w-none">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-sm">{msg.content}</p>
                          )}
                          {msg.images?.map((img, j) => (
                            <img key={j} src={img} alt="Gerada por IA" className="mt-2 rounded max-w-full" />
                          ))}
                        </div>
                        {msg.role === "user" && (
                          <div className="h-8 w-8 rounded-full bg-warm-200 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-warm-700" />
                          </div>
                        )}
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-muted rounded-lg p-3">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2 pt-4 border-t mt-4">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pergunte algo à IA..."
                  disabled={isLoading}
                />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar tools */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Gerar Imagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Descreva a imagem..."
                disabled={generatingImage}
              />
              <Button className="w-full" size="sm" disabled={generatingImage || !imagePrompt.trim()} onClick={generateImage}>
                {generatingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                Gerar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Sugestões Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Roteiro de Fotos", prompt: "Crie um roteiro detalhado para sessão de fotos de produtos personalizados" },
                { label: "Roteiro de Vídeo", prompt: "Crie um roteiro para vídeo de 60s para Reels/TikTok mostrando o processo de personalização" },
                { label: "Descrição de Produto", prompt: "Escreva uma descrição atrativa para uma caneca personalizada com foto de família" },
                { label: "Post para Instagram", prompt: "Crie um post completo para Instagram (legenda + hashtags) sobre canecas personalizadas" },
              ].map((s, i) => (
                <Button key={i} variant="outline" size="sm" className="w-full text-xs justify-start" onClick={() => sendMessage(s.prompt)}>
                  {s.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
