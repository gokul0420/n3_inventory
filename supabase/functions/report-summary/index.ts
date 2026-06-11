// Supabase Edge Function: report-summary
// Generates an AI-written executive summary for the stock report.
// The Anthropic API key stays server-side (set as a secret), never in the browser.
//
// Deploy:  supabase functions deploy report-summary
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// (or set both via the Supabase dashboard — see chat instructions)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    // Generic: accept { title, stats } for ANY report type, or legacy flat stats.
    const title = body.title || "Inventory Report";
    const stats = body.stats ?? body;

    const prompt = `You are an inventory operations analyst. Write a concise, professional executive summary (3-4 short paragraphs, plain prose — no markdown headings, no bullet symbols) for the report titled "${title}".

Use ONLY the figures in this JSON — do NOT invent or alter any numbers:
${JSON.stringify(stats, null, 2)}

Interpret the data for a manager: state the overall position, highlight the most important patterns or risks, call out anything that needs action, and end with a clear recommendation. Keep it factual and under 220 words.`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: `Anthropic error: ${t}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const summary = data?.content?.[0]?.text?.trim() || null;
    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
