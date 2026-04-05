import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, MessageCircle, Clock, AlertTriangle, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface Analysis {
  user_analysis: {
    fluency_score: number;
    vocabulary_score: number;
    confidence_score: number;
    clarity_score: number;
    overall_score: number;
    filler_words_count: number;
    filler_words: string[];
    message_count: number;
    avg_message_length: number;
    tips: string[];
  };
  partner_analysis: {
    fluency_score: number;
    vocabulary_score: number;
    confidence_score: number;
    clarity_score: number;
    overall_score: number;
    filler_words_count: number;
    message_count: number;
  };
  conversation_quality: number;
  topic_diversity: number;
  summary: string;
}

const ScoreBar = ({ label, score, color = "primary" }: { label: string; score: number; color?: string }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{score}%</span>
    </div>
    <div className="h-2 rounded-full bg-muted">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 1, delay: 0.3 }}
        className={`h-full rounded-full ${color === "accent" ? "bg-accent" : "bg-primary"}`}
      />
    </div>
  </div>
);

const PeerFeedback = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const messagesRaw = sessionStorage.getItem("peer_session_messages");
  const duration = parseInt(sessionStorage.getItem("peer_session_duration") || "0", 10);
  const userId = sessionStorage.getItem("peer_session_user_id") || "";

  useEffect(() => {
    const evaluate = async () => {
      if (!messagesRaw) {
        setError("No conversation data found.");
        setLoading(false);
        return;
      }

      try {
        const messages = JSON.parse(messagesRaw);
        // Label messages with "user" or "partner"
        const labeled = messages.map((m: any) => ({
          sender: m.user_id === userId ? "user" : "partner",
          content: m.content,
          timestamp: m.created_at,
        }));

        const resp = await fetch(`${SUPABASE_URL}/functions/v1/evaluate-peer-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({ messages: labeled, duration }),
        });

        if (!resp.ok) throw new Error("Evaluation failed");
        const data = await resp.json();
        setAnalysis(data);

        // Save session to database
        if (user) {
          await supabase.from("sessions").insert({
            user_id: user.id,
            mode: "real_conversation",
            duration_seconds: duration,
            fluency_score: data.user_analysis?.fluency_score,
            clarity_score: data.user_analysis?.clarity_score,
            vocabulary_score: data.user_analysis?.vocabulary_score,
            confidence_score: data.user_analysis?.confidence_score,
            overall_score: data.user_analysis?.overall_score,
            tips: data.user_analysis?.tips,
            transcript: JSON.parse(messagesRaw),
          });
        }
      } catch (e) {
        console.error("Evaluation error:", e);
        setError("Failed to evaluate conversation.");
      } finally {
        setLoading(false);
      }
    };
    evaluate();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 font-display text-lg font-bold text-foreground">Analyzing your conversation...</p>
          <p className="text-sm text-muted-foreground">The AI is reviewing your performance</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <p className="text-destructive">{error || "Something went wrong."}</p>
        <Button className="mt-4" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  const ua = analysis.user_analysis;

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-lg">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>

          {/* Overall Score */}
          <div className="mb-6 rounded-2xl bg-card p-6 text-center shadow-card">
            <Trophy className="mx-auto mb-2 h-8 w-8 text-primary" />
            <p className="font-display text-4xl font-extrabold text-foreground">{ua.overall_score}%</p>
            <p className="text-sm text-muted-foreground">Overall Score</p>
          </div>

          {/* Stats row */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-card p-3 text-center shadow-card">
              <MessageCircle className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="font-display text-lg font-bold text-foreground">{ua.message_count}</p>
              <p className="text-xs text-muted-foreground">Messages</p>
            </div>
            <div className="rounded-xl bg-card p-3 text-center shadow-card">
              <Clock className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="font-display text-lg font-bold text-foreground">{Math.floor(duration / 60)}m</p>
              <p className="text-xs text-muted-foreground">Duration</p>
            </div>
            <div className="rounded-xl bg-card p-3 text-center shadow-card">
              <AlertTriangle className="mx-auto mb-1 h-5 w-5 text-accent" />
              <p className="font-display text-lg font-bold text-foreground">{ua.filler_words_count}</p>
              <p className="text-xs text-muted-foreground">Fillers</p>
            </div>
          </div>

          {/* Scores */}
          <div className="mb-6 space-y-4 rounded-2xl bg-card p-6 shadow-card">
            <h3 className="font-display text-lg font-bold text-foreground">Your Performance</h3>
            <ScoreBar label="Fluency" score={ua.fluency_score} />
            <ScoreBar label="Vocabulary" score={ua.vocabulary_score} />
            <ScoreBar label="Confidence" score={ua.confidence_score} />
            <ScoreBar label="Clarity" score={ua.clarity_score} />
          </div>

          {/* Conversation Quality */}
          <div className="mb-6 space-y-3 rounded-2xl bg-card p-6 shadow-card">
            <h3 className="font-display text-lg font-bold text-foreground">Conversation Quality</h3>
            <ScoreBar label="Overall Quality" score={analysis.conversation_quality} color="accent" />
            <ScoreBar label="Topic Diversity" score={analysis.topic_diversity} color="accent" />
            <p className="text-sm text-muted-foreground">{analysis.summary}</p>
          </div>

          {/* Filler Words */}
          {ua.filler_words && ua.filler_words.length > 0 && (
            <div className="mb-6 rounded-2xl bg-card p-6 shadow-card">
              <h3 className="mb-3 font-display text-lg font-bold text-foreground">Filler Words Detected</h3>
              <div className="flex flex-wrap gap-2">
                {ua.filler_words.map((w, i) => (
                  <span key={i} className="rounded-lg bg-accent/10 px-3 py-1 text-sm text-accent">
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {ua.tips && ua.tips.length > 0 && (
            <div className="mb-6 rounded-2xl bg-card p-6 shadow-card">
              <h3 className="mb-3 font-display text-lg font-bold text-foreground">Suggestions</h3>
              <ul className="space-y-2">
                {ua.tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="mt-0.5 text-primary">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button onClick={() => navigate("/dashboard")} className="w-full rounded-xl" size="lg">
            Back to Dashboard
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default PeerFeedback;
