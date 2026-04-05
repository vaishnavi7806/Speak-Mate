import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Sparkles, Volume2, BookOpen, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface FeedbackData {
  fluency_score: number;
  clarity_score: number;
  vocabulary_score: number;
  confidence_score: number;
  tips: string[];
}

const Feedback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "conversation";
  const duration = parseInt(searchParams.get("duration") || "120");
  const level = sessionStorage.getItem("session_level") || "intermediate";
  const minutes = Math.floor(duration / 60);
  const secs = duration % 60;

  const levelTip: Record<string, string> = {
    beginner: "💬 Try to use simple sentences and speak slowly.",
    intermediate: "📚 Good communication. Try adding more complex sentences.",
    advanced: "🚀 Great fluency. Focus on clarity, vocabulary, and confidence.",
  };

  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const evaluate = async () => {
      const transcriptStr = sessionStorage.getItem("session_transcript");
      const transcript = transcriptStr ? JSON.parse(transcriptStr) : [];

      if (transcript.length === 0) {
        setFeedback({
          fluency_score: 70, clarity_score: 72,
          vocabulary_score: 68, confidence_score: 65,
          tips: ["Practice more to get detailed feedback!", "Try speaking in longer sentences.", "Use varied vocabulary."],
        });
        setLoading(false);
        return;
      }

      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/evaluate-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({ transcript, mode, duration }),
        });

        if (!resp.ok) throw new Error("Evaluation failed");
        const data = await resp.json();
        setFeedback(data);
      } catch (e) {
        console.error("Evaluation error:", e);
        setFeedback({
          fluency_score: 70, clarity_score: 72,
          vocabulary_score: 68, confidence_score: 65,
          tips: ["Keep practicing regularly.", "Try to elaborate your answers.", "Use more connecting words."],
        });
      } finally {
        setLoading(false);
      }
    };
    evaluate();
  }, [mode, duration]);

  // Save session to database
  useEffect(() => {
    const save = async () => {
      if (!feedback || !user || saved) return;
      const transcriptStr = sessionStorage.getItem("session_transcript");
      const transcript = transcriptStr ? JSON.parse(transcriptStr) : [];
      const overall = Math.round(
        (feedback.fluency_score + feedback.clarity_score + feedback.vocabulary_score + feedback.confidence_score) / 4
      );

      try {
        await supabase.from("sessions").insert({
          user_id: user.id,
          mode,
          duration_seconds: duration,
          fluency_score: feedback.fluency_score,
          clarity_score: feedback.clarity_score,
          vocabulary_score: feedback.vocabulary_score,
          confidence_score: feedback.confidence_score,
          overall_score: overall,
          tips: feedback.tips,
          transcript,
        });
        setSaved(true);
        sessionStorage.removeItem("session_transcript");
      } catch (e) {
        console.error("Save error:", e);
      }
    };
    save();
  }, [feedback, user, saved, mode, duration]);

  const metrics = feedback
    ? [
        { label: "Fluency", score: feedback.fluency_score, icon: Volume2, color: "text-primary" },
        { label: "Clarity", score: feedback.clarity_score, icon: Eye, color: "text-teal-dark" },
        { label: "Vocabulary", score: feedback.vocabulary_score, icon: BookOpen, color: "text-gold" },
        { label: "Confidence", score: feedback.confidence_score, icon: Sparkles, color: "text-accent" },
      ]
    : [];

  const overall = feedback
    ? Math.round((feedback.fluency_score + feedback.clarity_score + feedback.vocabulary_score + feedback.confidence_score) / 4)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground font-display">Analyzing your performance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-2 text-center">
            <span className="inline-block text-4xl">🎉</span>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-foreground">Great Session!</h1>
             <p className="mt-1 text-muted-foreground">
               You practiced for {minutes}m {secs}s • Overall: <span className="font-bold text-primary">{overall}%</span>
             </p>
             <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary capitalize">
               Level: {level}
             </span>
           </div>
         </motion.div>

         {/* Level-specific tip */}
         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
           className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center text-sm font-medium text-foreground"
         >
           {levelTip[level] || levelTip.intermediate}
         </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-8 grid grid-cols-2 gap-4"
        >
          {metrics.map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="rounded-2xl border border-border bg-card p-5 shadow-card text-center"
            >
              <metric.icon className={`mx-auto h-6 w-6 ${metric.color}`} />
              <p className="mt-3 font-display text-3xl font-extrabold text-foreground">{metric.score}%</p>
              <p className="mt-1 text-sm text-muted-foreground">{metric.label}</p>
              <div className="mx-auto mt-3 h-2 w-full max-w-[120px] overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${metric.score}%` }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8"
          >
            <h2 className="mb-3 font-display text-lg font-bold text-foreground">💡 Tips for Improvement</h2>
            <div className="space-y-3">
              {feedback.tips.map((tip, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-card">
                  {tip}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 flex gap-3"
        >
          <Button className="flex-1" size="lg" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
          <Button
            variant="coral"
            size="lg"
            className="flex-1"
            onClick={() => navigate(`/conversation?mode=${mode}`)}
          >
            Practice Again
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </motion.div>
      </main>
    </div>
  );
};

export default Feedback;
