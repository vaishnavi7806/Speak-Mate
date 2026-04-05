import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, CheckCircle2, Flame, Trophy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-secondary text-secondary-foreground",
  medium: "bg-primary/10 text-primary",
  hard: "bg-accent/10 text-accent",
};

const DailyChallenge = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [justCompleted, setJustCompleted] = useState(false);

  // Get today's challenge (deterministic based on date)
  const { data: challenge, isLoading: loadingChallenge } = useQuery({
    queryKey: ["daily-challenge"],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_challenges")
        .select("*")
        .order("id");
      if (!data?.length) return null;
      const today = new Date();
      const dayOfYear = Math.floor(
        (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
      );
      return data[dayOfYear % data.length];
    },
  });

  // Get user's completions
  const { data: completions } = useQuery({
    queryKey: ["challenge-completions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("challenge_completions")
        .select("*")
        .order("challenge_date", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const completedToday = completions?.some((c) => c.challenge_date === todayStr);

  // Calculate challenge streak
  const challengeStreak = (() => {
    if (!completions?.length) return 0;
    const dates = completions.map((c) => c.challenge_date);
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      if (dates.includes(dateStr)) {
        streak++;
      } else if (i > 0) break;
    }
    return streak;
  })();

  const totalCompleted = completions?.length || 0;

  const completeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("challenge_completions").insert({
        user_id: user!.id,
        challenge_id: challenge!.id,
        challenge_date: todayStr,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setJustCompleted(true);
      queryClient.invalidateQueries({ queryKey: ["challenge-completions"] });
      toast.success("Challenge completed! 🎉");
    },
    onError: () => {
      toast.error("Could not save completion. Try again.");
    },
  });

  if (loadingChallenge || !challenge) return null;

  const isCompleted = completedToday || justCompleted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="mb-8"
    >
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-accent/10 p-2">
              <Target className="h-5 w-5 text-accent" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground">
              Daily Challenge
            </h3>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              DIFFICULTY_COLORS[challenge.difficulty] || DIFFICULTY_COLORS.easy
            }`}
          >
            {challenge.difficulty}
          </span>
        </div>

        {/* Challenge content */}
        <div className="mb-4">
          <h4 className="font-display text-base font-bold text-foreground">
            {challenge.title}
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {challenge.description}
          </p>
        </div>

        {/* Completion button */}
        <AnimatePresence mode="wait">
          {isCompleted ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 rounded-xl bg-primary/10 p-3"
            >
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-primary">
                Completed today!
              </span>
              <Sparkles className="ml-auto h-4 w-4 text-primary" />
            </motion.div>
          ) : (
            <motion.div key="pending">
              <Button
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="w-full rounded-xl"
                variant="coral"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark as Completed
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center rounded-xl bg-secondary/50 p-2.5">
            <Flame className="mb-1 h-4 w-4 text-accent" />
            <span className="font-display text-lg font-bold text-foreground">
              {challengeStreak}
            </span>
            <span className="text-[10px] text-muted-foreground">Streak</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-secondary/50 p-2.5">
            <Trophy className="mb-1 h-4 w-4 text-primary" />
            <span className="font-display text-lg font-bold text-foreground">
              {totalCompleted}
            </span>
            <span className="text-[10px] text-muted-foreground">Done</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-secondary/50 p-2.5">
            <Target className="mb-1 h-4 w-4 text-muted-foreground" />
            <span className="font-display text-lg font-bold text-foreground">
              {Math.round((totalCompleted / 30) * 100)}%
            </span>
            <span className="text-[10px] text-muted-foreground">Month</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
            <span>Monthly progress</span>
            <span>{totalCompleted}/30 challenges</span>
          </div>
          <Progress
            value={Math.min((totalCompleted / 30) * 100, 100)}
            className="h-2"
          />
        </div>
      </div>
    </motion.div>
  );
};

export default DailyChallenge;
