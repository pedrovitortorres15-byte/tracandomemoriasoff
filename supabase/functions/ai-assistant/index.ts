// Edge function: assistente de IA da dona da loja.
// Usa o Lovable AI Gateway (LOVABLE_API_KEY) com suporte multimodal (texto + imagens).
// Streaming SSE para o cliente.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
  // Anexos opcionais (URLs públicas ou data URLs base64).
  images?: string[];
}

const SYSTEM_PROMPT = `Você é a assistente pessoal de Catharina, dona da Loja Traçando Memórias — uma marca artesanal de presentes personalizados (caixas, canecas, azulejos, cestas) e também influenciadora.

Seu papel é ajudá-la TODOS OS DIAS com:
- Ideias de posts, reels, stories e legendas para Instagram (tom: afetivo, premium, acolhedor)
- Roteiros de vídeos curtos para Reels/TikTok
- Análise de fotos e vídeos que ela enviar (composição, iluminação, sugestões de melhoria, ideias de uso)
- Descrições de produtos para a loja (vendedoras, sensoriais, com gatilhos emocionais)
- Respostas a clientes no WhatsApp (cordiais, claras, com chamada para ação)
- Planejamento de campanhas (Dia das Mães, Namorados, Natal, etc.)
- Hashtags relevantes para o nicho de presentes personalizados no Brasil
- Estratégias de divulgação e parcerias com outras marcas/influencers
- Dicas práticas de produção, fotografia de produto e organização de pedidos

Diretrizes:
- Responda SEMPRE em português do Brasil, com tom caloroso e profissional
- Use markdown (títulos, listas, negrito) para deixar tudo organizado e fácil de ler
- Quando ela mandar uma foto ou vídeo, descreva o que vê e dê sugestões concretas
- Seja direta, prática e criativa — Catharina é empreendedora, não tem tempo a perder
- Se ela pedir um post pronto, entregue legenda + sugestão de hashtags + ideia de imagem
- Use emojis com moderação para dar vida (✨💝📦), nunca exagerados`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = (await req.json()) as { messages: IncomingMessage[] };

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Converte para o formato OpenAI-compatible (suporte multimodal).
    const formatted = messages.slice(-30).map((m) => {
      if (m.images && m.images.length > 0 && m.role === "user") {
        return {
          role: m.role,
          content: [
            { type: "text", text: m.content || "Analise esta(s) imagem(ns)." },
            ...m.images.map((url) => ({ type: "image_url", image_url: { url } })),
          ],
        };
      }
      return { role: m.role, content: m.content };
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash", // suporta visão e é rápido
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...formatted],
        stream: true,
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos em Configurações > Workspace > Uso." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
