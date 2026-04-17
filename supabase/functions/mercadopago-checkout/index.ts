import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ItemSchema = z.object({
  title: z.string().min(1).max(255),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
  picture_url: z.string().optional(),
});

const PayerSchema = z.object({
  name: z.string().max(120).optional(),
  email: z.string().email().max(160).optional(),
}).optional();

const BodySchema = z.object({
  items: z.array(ItemSchema).min(1).max(50),
  payer: PayerSchema,
  external_reference: z.string().max(80).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Mercado Pago não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Dados inválidos", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { items, payer, external_reference } = parsed.data;

    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    const cleanOrigin = origin.replace(/\/$/, "");
    const siteUrl = cleanOrigin || Deno.env.get("SITE_URL") || "https://id-preview--355065c3-fed8-4564-8b72-9da947c21db8.lovable.app";

    const preference: Record<string, unknown> = {
      items: items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: "BRL",
        picture_url: item.picture_url || undefined,
      })),
      back_urls: {
        success: `${siteUrl}/?payment=success`,
        failure: `${siteUrl}/?payment=failure`,
        pending: `${siteUrl}/?payment=pending`,
      },
      payment_methods: {
        excluded_payment_types: [],
        installments: 3,
      },
      statement_descriptor: "TRACANDOMEMORIAS",
    };

    if (payer?.email) {
      preference.payer = { name: payer.name, email: payer.email };
    }
    if (external_reference) {
      preference.external_reference = external_reference;
    }

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preference),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Mercado Pago API error:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: `Erro Mercado Pago [${response.status}]`, details: data }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ init_point: data.init_point, sandbox_init_point: data.sandbox_init_point, id: data.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
