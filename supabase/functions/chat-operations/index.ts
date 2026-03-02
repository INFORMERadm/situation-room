import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Unauthorized", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const { action, conversationId, messages, userMessage } = await req.json();

    if (action === "ai-reply") {
      if (!conversationId || !userMessage) {
        return errorResponse("Missing conversationId or userMessage", 400);
      }

      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: participants } = await serviceClient
        .from("messaging_participants")
        .select("user_id")
        .eq("conversation_id", conversationId);

      const isParticipant = participants?.some(
        (p: { user_id: string }) => p.user_id === user.id
      );
      if (!isParticipant) return errorResponse("Not a participant", 403);

      const contextMessages = Array.isArray(messages)
        ? messages.slice(-20)
        : [];

      const systemPrompt = `You are Hypermind 6.5, an advanced AI assistant participating in a group chat on the N4 platform. You are helpful, concise, and conversational. You have expertise in financial markets, technology, and general knowledge. Keep responses brief and natural for a chat context. Do not use markdown formatting heavily - keep it chat-friendly.`;

      const apiMessages = [
        { role: "system", content: systemPrompt },
        ...contextMessages.map(
          (m: { role: string; content: string }) => ({
            role: m.role === "ai" ? "assistant" : "user",
            content: m.content,
          })
        ),
        { role: "user", content: userMessage },
      ];

      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openaiKey) return errorResponse("AI service not configured", 503);

      const aiRes = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: apiMessages,
            max_tokens: 1024,
            temperature: 0.7,
          }),
        }
      );

      if (!aiRes.ok) {
        const errBody = await aiRes.text();
        return errorResponse(`AI API error: ${errBody}`, 502);
      }

      const aiData = await aiRes.json();
      const reply =
        aiData.choices?.[0]?.message?.content || "Sorry, I could not respond.";

      return new Response(JSON.stringify({ reply }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return errorResponse("Unknown action", 400);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      500
    );
  }
});
