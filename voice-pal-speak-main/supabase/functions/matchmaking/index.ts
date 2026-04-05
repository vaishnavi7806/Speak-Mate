import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate the user using their JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error("Unauthorized");
    }

    const userId = user.id;

    const { action, english_level, room_id } = await req.json();

    if (action === "join_queue") {
      await supabase.from("matchmaking_queue").delete().eq("user_id", userId);

      const { data: waitingUsers } = await supabase
        .from("matchmaking_queue")
        .select("*")
        .eq("status", "waiting")
        .eq("english_level", english_level || "intermediate")
        .neq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1);

      if (waitingUsers && waitingUsers.length > 0) {
        const match = waitingUsers[0];

        const { data: room, error: roomError } = await supabase
          .from("peer_rooms")
          .insert({ user1_id: match.user_id, user2_id: userId })
          .select()
          .single();

        if (roomError) throw roomError;

        await supabase
          .from("matchmaking_queue")
          .update({ status: "matched" })
          .eq("id", match.id);

        return new Response(JSON.stringify({ status: "matched", room }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        await supabase
          .from("matchmaking_queue")
          .insert({ user_id: userId, english_level: english_level || "intermediate", status: "waiting" });

        return new Response(JSON.stringify({ status: "waiting" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "check_status") {
      const { data: queueEntry } = await supabase
        .from("matchmaking_queue")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "matched")
        .maybeSingle();

      if (queueEntry) {
        const { data: room } = await supabase
          .from("peer_rooms")
          .select("*")
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (room) {
          await supabase.from("matchmaking_queue").delete().eq("user_id", userId);
          return new Response(JSON.stringify({ status: "matched", room }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ status: "waiting" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "leave_queue") {
      await supabase.from("matchmaking_queue").delete().eq("user_id", userId);
      return new Response(JSON.stringify({ status: "left" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "end_room") {
      if (!room_id) throw new Error("room_id required");
      await supabase
        .from("peer_rooms")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", room_id);
      return new Response(JSON.stringify({ status: "ended" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (e) {
    console.error("matchmaking error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
