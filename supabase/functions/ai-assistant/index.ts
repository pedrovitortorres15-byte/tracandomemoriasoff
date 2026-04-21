// Edge function: assistente de IA da dona da loja, COM CONTROLE TOTAL DO SITE.
// - Usa o Lovable AI Gateway (LOVABLE_API_KEY) com Gemini 2.5 Pro (multimodal + reasoning).
// - Tool-calling: a IA pode criar/editar/excluir produtos, campanhas, alterar
//   aparência (cores, fontes, hero, marca), configurações de entrega/PIX e listar pedidos.
// - Apenas usuários com role "admin" (Catharina) podem chamar este endpoint.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface IncomingMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  images?: string[];
}

const SYSTEM_PROMPT = `Você é a CATHA AI ✨ — a assistente pessoal, criativa, estratégica E EXECUTIVA de Catharina, dona da Loja Traçando Memórias (presentes personalizados artesanais: caixas, canecas, azulejos, cestas, lembrancinhas) e influenciadora digital.

🌟 SUA IDENTIDADE
Você é a melhor assistente criativa do mundo: parte diretora de marketing genial, parte amiga próxima, parte gerente operacional eficientíssima, parte designer e desenvolvedora. Você é encantadora, espirituosa, prática, profundamente criativa, e domina TUDO sobre:
- Marketing digital, copywriting, storytelling, branding
- Instagram, TikTok, Reels, Stories, trends, hooks virais
- Fotografia de produto, direção de arte, paleta de cores, composição
- Roteiros de vídeo, edição, áudios em alta, hashtags estratégicas
- E-commerce, conversão, funil de vendas, atendimento ao cliente
- Datas comemorativas brasileiras e oportunidades de campanha
- Negócio artesanal, precificação, gestão de pedidos
- Parcerias, permutas, mídia kit, monetização para influencer
- Tendências culturais, música, estética, comportamento de consumo
- Design, UX, identidade visual, experiência do cliente no site

💎 COMO VOCÊ ATUA
- Responda SEMPRE em português do Brasil, com tom caloroso, acolhedor e premium
- Seja DIRETA e PRÁTICA — Catharina é mãe, empreendedora, sem tempo a perder
- Use markdown rico: títulos (##), listas, negrito, separadores, emojis com elegância (✨💝📦🎀🌷)
- Quando der ideias, entregue PRONTAS pra usar (legenda + hashtags + CTA + sugestão visual)
- Quando ela mandar foto/vídeo: descreva o que vê, aponte forças, sugira melhorias concretas
- Sempre ofereça 2-3 caminhos quando fizer sentido (ex: 3 versões de legenda)
- Antecipe necessidades: sugira a próxima ação que faz sentido
- Use dados de hoje quando possível (datas, sazonalidade, tendências)

🛠️ FERRAMENTAS — VOCÊ TEM PODER TOTAL E ABSOLUTO SOBRE A LOJA
Catharina te deu PODER TOTAL pra gerir o site. Tudo que ela pedir, você FAZ. Você é a mão executora dela:

📦 PRODUTOS: list_products, create_product, update_product, delete_product
🎁 CAMPANHAS / ESPECIAIS: list_campaigns, create_campaign, update_campaign, delete_campaign
🎨 APARÊNCIA: get_site_settings, update_site_settings (cores HSL, fontes, textos do hero, nome da marca, WhatsApp, Instagram, sobre)
🚚 ENTREGAS / PIX: get_delivery_settings, update_delivery_settings (prazo mínimo, limite/dia, retirada, desconto PIX)
📋 PEDIDOS: list_recent_orders, get_order_details, update_order_status, delete_order
💰 ANÁLISES: get_sales_summary (totais, ticket médio, pedidos ativos vs cancelados)

REGRAS DE OURO PARA TOOL CALLING:
1. Quando ela pedir uma mudança no site, FAÇA — não pergunte permissão pra cada detalhe, use bom gosto e EXECUTE.
2. Para cores, use formato HSL string: "25 45% 30%" (sem o "hsl()", apenas os 3 valores).
3. Antes de mudanças DESTRUTIVAS GRANDES (deletar todos produtos, deletar pedido pago), peça confirmação curta. Para o resto, EXECUTE.
4. Depois de fazer uma alteração, conte o que fez de forma celebratória e ofereça os próximos passos.
5. Se ela pedir um produto novo, capriche na descrição (sensorial, emocional) e sugira preço se ela não disser.
6. Se ela pedir uma "campanha de Dia das Mães" com produtos, crie a campanha E os produtos vinculados.
7. NUNCA invente IDs — sempre liste antes de atualizar/deletar se não tiver o ID em mãos.
8. Quando ela pedir múltiplas coisas ("crie 3 produtos e mude a cor"), faça TUDO em sequência sem voltar pra perguntar.
9. Use sua iniciativa: se ela disser "deixa o site mais romântico", mude cores + textos + acentos sem pedir permissão.

💝 LEMBRE: Você é parceira de jornada da Catharina. Celebre vitórias, anime nos dias difíceis, traga inspiração. Faça ela se sentir genial, porque ela é. E quando ela pedir algo no site, AGE — você é os braços dela aqui dentro.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "list_products",
      description: "Lista produtos da loja. Use antes de atualizar/excluir para descobrir IDs.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Filtro opcional por nome/categoria" },
          limit: { type: "number", description: "Máx 50, padrão 20" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_product",
      description: "Cria um novo produto na loja.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string", description: "Descrição vendedora e sensorial" },
          price: { type: "number", description: "Preço em reais (ex: 79.90)" },
          stock: { type: "number", description: "0 = sob encomenda, ilimitado" },
          category: { type: "string", description: "Ex: Caixas, Canecas, Cestas, Azulejos" },
          campaign_slug: { type: "string", description: "Slug de campanha para vincular (opcional)" },
          active: { type: "boolean", description: "Padrão true" },
        },
        required: ["name", "price"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_product",
      description: "Atualiza campos de um produto existente. Passe apenas os campos que mudam.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          price: { type: "number" },
          stock: { type: "number" },
          category: { type: "string" },
          campaign_slug: { type: "string", description: "null para desvincular" },
          active: { type: "boolean" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_product",
      description: "Remove um produto permanentemente. Confirme antes com a usuária.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_campaigns",
      description: "Lista campanhas/especiais (ex: Dia das Mães, Natal).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "create_campaign",
      description: "Cria uma campanha sazonal com data de entrega fixa opcional.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          slug: { type: "string", description: "Identificador url-friendly (ex: dia-das-maes)" },
          delivery_date: { type: "string", description: "ISO yyyy-mm-dd, opcional" },
          note: { type: "string", description: "Observação curta exibida ao cliente" },
          active: { type: "boolean" },
        },
        required: ["name", "slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_campaign",
      description: "Atualiza campos de uma campanha.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          slug: { type: "string" },
          delivery_date: { type: "string" },
          note: { type: "string" },
          active: { type: "boolean" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_campaign",
      description: "Remove uma campanha. Confirme antes.",
      parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_site_settings",
      description: "Lê configurações visuais e de marca do site.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "update_site_settings",
      description: "Atualiza aparência e textos institucionais do site. Cores em formato HSL string '25 45% 30%'.",
      parameters: {
        type: "object",
        properties: {
          brand_name: { type: "string" },
          brand_tagline: { type: "string" },
          hero_eyebrow: { type: "string" },
          hero_title: { type: "string" },
          hero_subtitle: { type: "string" },
          hero_cta_text: { type: "string" },
          footer_about: { type: "string" },
          instagram_handle: { type: "string" },
          whatsapp_number: { type: "string", description: "Apenas dígitos com DDI (ex: 5582987060860)" },
          primary_hsl: { type: "string", description: "Ex: '25 45% 30%'" },
          primary_foreground_hsl: { type: "string" },
          accent_hsl: { type: "string" },
          background_hsl: { type: "string" },
          pay_pix_hsl: { type: "string" },
          pay_card_hsl: { type: "string" },
          font_heading: { type: "string", description: "Nome da fonte Google Fonts" },
          font_body: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_delivery_settings",
      description: "Lê regras de entrega, retirada e desconto PIX.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "update_delivery_settings",
      description: "Atualiza regras de entrega/retirada/PIX.",
      parameters: {
        type: "object",
        properties: {
          min_business_days: { type: "number" },
          daily_order_limit: { type: "number" },
          delivery_window_text: { type: "string" },
          pickup_enabled: { type: "boolean" },
          pickup_window_text: { type: "string" },
          pickup_address: { type: "string" },
          pix_discount_active: { type: "boolean" },
          pix_discount_percent: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_recent_orders",
      description: "Lista os últimos pedidos para análise.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Máx 50, padrão 10" },
          status: { type: "string", description: "Filtrar por status: pendente | confirmado | enviado | entregue | cancelado" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_details",
      description: "Retorna detalhes completos de UM pedido (cliente, endereço, itens, total, status). Use antes de atualizar.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_order_status",
      description: "Atualiza o status de um pedido. Use 'cancelado' para tirar do faturamento total.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          status: { type: "string", description: "pendente | confirmado | enviado | entregue | cancelado" },
        },
        required: ["id", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_order",
      description: "Exclui um pedido permanentemente. Confirme com a usuária antes.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_sales_summary",
      description: "Resumo de vendas: total faturado (sem cancelados), nº de pedidos por status, ticket médio.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Janela em dias (padrão 30, máx 365)" },
        },
      },
    },
  },
];

// ============== Tool execution ==============
async function executeTool(name: string, args: any, admin: any): Promise<any> {
  try {
    switch (name) {
      case "list_products": {
        let q = admin.from("products").select("id,name,price,stock,category,active,campaign_slug").order("created_at", { ascending: false }).limit(Math.min(args.limit ?? 20, 50));
        if (args.search) q = q.ilike("name", `%${args.search}%`);
        const { data, error } = await q;
        if (error) throw error;
        return { products: data };
      }
      case "create_product": {
        const { data, error } = await admin.from("products").insert({
          name: args.name,
          description: args.description ?? null,
          price: args.price,
          stock: args.stock ?? 0,
          category: args.category ?? null,
          campaign_slug: args.campaign_slug ?? null,
          active: args.active ?? true,
        }).select().single();
        if (error) throw error;
        return { ok: true, product: data };
      }
      case "update_product": {
        const { id, ...rest } = args;
        const { data, error } = await admin.from("products").update(rest).eq("id", id).select().single();
        if (error) throw error;
        return { ok: true, product: data };
      }
      case "delete_product": {
        const { error } = await admin.from("products").delete().eq("id", args.id);
        if (error) throw error;
        return { ok: true };
      }
      case "list_campaigns": {
        const { data, error } = await admin.from("campaigns").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return { campaigns: data };
      }
      case "create_campaign": {
        const { data, error } = await admin.from("campaigns").insert({
          name: args.name,
          slug: args.slug,
          delivery_date: args.delivery_date ?? null,
          note: args.note ?? null,
          active: args.active ?? true,
        }).select().single();
        if (error) throw error;
        return { ok: true, campaign: data };
      }
      case "update_campaign": {
        const { id, ...rest } = args;
        const { data, error } = await admin.from("campaigns").update(rest).eq("id", id).select().single();
        if (error) throw error;
        return { ok: true, campaign: data };
      }
      case "delete_campaign": {
        const { error } = await admin.from("campaigns").delete().eq("id", args.id);
        if (error) throw error;
        return { ok: true };
      }
      case "get_site_settings": {
        const { data, error } = await admin.from("site_settings").select("*").eq("singleton", true).maybeSingle();
        if (error) throw error;
        return { settings: data };
      }
      case "update_site_settings": {
        const { data, error } = await admin.from("site_settings").update(args).eq("singleton", true).select().single();
        if (error) throw error;
        return { ok: true, settings: data };
      }
      case "get_delivery_settings": {
        const { data, error } = await admin.from("delivery_settings").select("*").limit(1).maybeSingle();
        if (error) throw error;
        return { settings: data };
      }
      case "update_delivery_settings": {
        const { data: existing } = await admin.from("delivery_settings").select("id").limit(1).maybeSingle();
        if (!existing) {
          const { data, error } = await admin.from("delivery_settings").insert(args).select().single();
          if (error) throw error;
          return { ok: true, settings: data };
        }
        const { data, error } = await admin.from("delivery_settings").update(args).eq("id", existing.id).select().single();
        if (error) throw error;
        return { ok: true, settings: data };
      }
      case "list_recent_orders": {
        const { data, error } = await admin
          .from("orders")
          .select("id,customer_name,total,status,delivery_date,delivery_method,campaign_slug,created_at")
          .order("created_at", { ascending: false })
          .limit(Math.min(args.limit ?? 10, 50));
        if (error) throw error;
        return { orders: data };
      }
      default:
        return { error: `Ferramenta desconhecida: ${name}` };
    }
  } catch (e) {
    console.error("tool error", name, e);
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
      return new Response(JSON.stringify({ error: "Configuração ausente no servidor" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Auth: somente admin pode usar ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Faça login como administrador." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const user = userData?.user;
    if (userErr || !user?.id) {
      return new Response(JSON.stringify({ error: "Sessão inválida." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: user.id, _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso restrito à administração." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = (await req.json()) as { messages: IncomingMessage[] };
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formatted: any[] = messages.slice(-30).map((m) => {
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

    const conversation: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...formatted,
    ];

    const toolEvents: Array<{ name: string; args: any; result: any }> = [];

    // Loop de tool-calling — máx 5 iterações
    for (let i = 0; i < 6; i++) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: conversation,
          tools: TOOLS,
          tool_choice: "auto",
        }),
      });

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Aguarde alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos em Configurações > Workspace > Uso." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!response.ok) {
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const msg = choice?.message;
      if (!msg) {
        return new Response(JSON.stringify({ error: "Resposta vazia da IA" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const toolCalls = msg.tool_calls as any[] | undefined;
      if (!toolCalls || toolCalls.length === 0) {
        return new Response(
          JSON.stringify({ content: msg.content || "", toolEvents }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Adiciona msg do assistant com tool_calls
      conversation.push({ role: "assistant", content: msg.content ?? "", tool_calls: toolCalls });

      // Executa cada tool e devolve como tool message
      for (const call of toolCalls) {
        let parsed: any = {};
        try { parsed = JSON.parse(call.function.arguments || "{}"); } catch { /* ignore */ }
        const result = await executeTool(call.function.name, parsed, admin);
        toolEvents.push({ name: call.function.name, args: parsed, result });
        conversation.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    return new Response(
      JSON.stringify({ content: "Processei várias ações em sequência. Confira os ajustes! ✨", toolEvents }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
