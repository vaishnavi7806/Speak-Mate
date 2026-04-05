import { motion } from "framer-motion";
import { Clock, TrendingUp, Calendar } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const modeLabels: Record<string, string> = {
  interview: "Interview",
  debate: "Debate",
  conversation: "Conversation",
  group_discussion: "Group Discussion",
};

const History = () => {
  const { user } = useAuth();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions-history", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("sessions")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-extrabold text-foreground">Session History</h1>
          <p className="mt-1 text-muted-foreground">Track your progress over time.</p>
        </motion.div>

        {isLoading ? (
          <div className="mt-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : !sessions?.length ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 text-center"
          >
            <p className="text-lg text-muted-foreground">No sessions yet. Start practicing!</p>
          </motion.div>
        ) : (
          <div className="mt-6 space-y-3">
            {sessions.map((session, i) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-card p-5 shadow-card"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display font-bold text-foreground">
                      {modeLabels[session.mode] || session.mode}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(session.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(session.duration_seconds)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-bold text-primary">
                      {session.overall_score || "—"}%
                    </p>
                    <p className="text-xs text-muted-foreground">Overall</p>
                  </div>
                </div>

                {session.fluency_score && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {[
                      { label: "Fluency", score: session.fluency_score },
                      { label: "Clarity", score: session.clarity_score },
                      { label: "Vocab", score: session.vocabulary_score },
                      { label: "Confidence", score: session.confidence_score },
                    ].map((m) => (
                      <div key={m.label} className="text-center">
                        <p className="text-xs text-muted-foreground">{m.label}</p>
                        <p className="font-display text-sm font-bold text-foreground">{m.score}%</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default History;
