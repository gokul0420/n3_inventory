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

    const stats = await req.json();

    const prompt = `You are an inventory analyst. Write a concise, professional executive summary (3-4 short paragraphs, plain prose, no markdown headings or bullet symbols) for a stock availability report, using ONLY these figures — do not invent numbers:

Total SKUs: ${stats.totalSkus}
Total units: ${stats.totalUnits}
Categories: ${stats.categoryCount}
Departments: ${stats.departmentCount}
Health counts: healthy=${stats.health?.healthy}, low=${stats.health?.low}, critical=${stats.health?.critical}, out_of_stock=${stats.health?.out_of_stock}
Units by category: ${JSON.stringify(stats.byCategory)}
Watchlist (items needing attention): ${JSON.stringify(stats.watchlist)}

Cover: overall stock position, health/risk assessment, notable category concentrations, and a clear recommendation on what to reorder or monitor. Keep it factual and under 220 words.`;

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
