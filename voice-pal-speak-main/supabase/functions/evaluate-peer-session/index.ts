import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, duration } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an English language coach analyzing a peer-to-peer conversation between two learners. Evaluate BOTH users' performance.

Analyze the conversation and return a JSON object with this exact structure:
{
  "user_analysis": {
    "fluency_score": <0-100>,
    "vocabulary_score": <0-100>,
    "confidence_score": <0-100>,
    "clarity_score": <0-100>,
    "overall_score": <0-100>,
    "filler_words_count": <number>,
    "filler_words": ["list of filler words used"],
    "message_count": <number>,
    "avg_message_length": <number>,
    "tips": ["3-4 specific improvement suggestions"]
  },
  "partner_analysis": {
    "fluency_score": <0-100>,
    "vocabulary_score": <0-100>,
    "confidence_score": <0-100>,
    "clarity_score": <0-100>,
    "overall_score": <0-100>,
    "filler_words_count": <number>,
    "message_count": <number>
  },
  "conversation_quality": <0-100>,
  "topic_diversity": <0-100>,
  "summary": "Brief summary of the conversation quality"
}

Return ONLY valid JSON, no markdown.`,
          },
          {
            role: "user",
            content: `Conversation duration: ${duration} seconds.\n\nMessages:\n${JSON.stringify(messages)}`,
          },
        ],
        stream: false,
      }),
    });

    if (!response.ok) throw new Error("AI gateway error");

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "{}";
    // Strip markdown code fences if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const analysis = JSON.parse(content);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-peer-session error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
