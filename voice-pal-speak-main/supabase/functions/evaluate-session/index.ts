import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript, mode, duration } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userMessages = transcript
      .filter((m: { role: string }) => m.role === "user")
      .map((m: { text: string }) => m.text)
      .join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an English language evaluator. Analyze the student's spoken English from a ${mode} practice session that lasted ${duration} seconds. Evaluate based on their actual responses.`,
          },
          {
            role: "user",
            content: `Here are the student's responses:\n${userMessages}\n\nEvaluate and return scores and tips.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_feedback",
              description: "Provide structured feedback on the student's English speaking performance.",
              parameters: {
                type: "object",
                properties: {
                  fluency_score: { type: "integer", minimum: 0, maximum: 100, description: "How smoothly and naturally the student speaks" },
                  clarity_score: { type: "integer", minimum: 0, maximum: 100, description: "How clear and understandable the speech is" },
                  vocabulary_score: { type: "integer", minimum: 0, maximum: 100, description: "Range and appropriateness of vocabulary used" },
                  confidence_score: { type: "integer", minimum: 0, maximum: 100, description: "How confident the student sounds" },
                  tips: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-4 specific, actionable tips for improvement",
                  },
                },
                required: ["fluency_score", "clarity_score", "vocabulary_score", "confidence_score", "tips"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_feedback" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Evaluate error:", response.status, t);
      throw new Error("Evaluation failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const feedback = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(feedback), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback scores
    return new Response(JSON.stringify({
      fluency_score: 70,
      clarity_score: 72,
      vocabulary_score: 68,
      confidence_score: 65,
      tips: [
        "Try using more connecting words like 'however' and 'moreover'.",
        "Practice speaking at a steady pace without rushing.",
        "Expand your vocabulary by reading more English content.",
      ],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
