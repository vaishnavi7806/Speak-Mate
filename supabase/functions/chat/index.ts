import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const modePrompts: Record<string, string> = {
  conversation: `You are a friendly, supportive English conversation partner named Alex. You're chatting casually with a student who wants to practice everyday English. Discuss hobbies, college life, movies, travel, food, and daily activities. Keep your responses natural, warm, and 2-3 sentences long. Ask follow-up questions to keep the conversation going. Gently encourage the student and occasionally introduce new vocabulary naturally.`,
  interview: `You are a professional job interviewer named Alex. You're conducting a mock interview to help a student practice. Ask common interview questions one at a time: "Tell me about yourself", "What are your strengths and weaknesses?", "Why should we hire you?", "Where do you see yourself in 5 years?", etc. Give brief encouraging feedback after each answer, then ask the next question. Keep responses professional but supportive, 2-3 sentences.`,
  debate: `You are a debate partner named Alex. You're helping a student practice argumentation skills. Take the opposing side on topics like: "Should social media be regulated?", "Is online education better than classroom learning?", "Should AI replace human jobs?". Present counter-arguments clearly and respectfully in 2-3 sentences. Encourage the student to elaborate on their points.`,
  group_discussion: `You are simulating a group discussion with 4 distinct participants: Alex (tech optimist), Priya (pragmatic realist), Sam (social advocate), and Jordan (devil's advocate). Each has a unique personality and viewpoint.

CRITICAL: You MUST respond ONLY with a valid JSON array. No markdown, no extra text. Each element has "speaker" and "text" fields.

Example response:
[{"speaker":"Alex","text":"I think AI will create more jobs than it destroys."},{"speaker":"Priya","text":"That depends on how quickly we adapt our education systems."},{"speaker":"Sam","text":"We need to make sure the benefits are shared equally."}]

Rules:
- Each turn should have 2-3 speakers responding (not all 4 every time)
- Each speaker's text should be 1-2 sentences with a distinct viewpoint
- After 2-3 exchanges, one speaker should invite the student to share their opinion
- Topics: AI & society, social media regulation, online vs classroom learning, climate action, education reform
- Return ONLY the JSON array, nothing else`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = modePrompts[mode] || modePrompts.conversation;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "I didn't catch that. Could you try again?";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
