import { motion } from "framer-motion";
import { Briefcase, Swords, Coffee, Users, TrendingUp, Clock, Flame } from "lucide-react";
import Navbar from "@/components/Navbar";
import ModeCard from "@/components/ModeCard";
import DailyChallenge from "@/components/DailyChallenge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const modes = [
  {
    title: "Daily Conversation",
    description: "Casual chitchat about hobbies, movies, college life, and daily activities.",
    icon: Coffee,
    color: "gold" as const,
    mode: "conversation",
  },
  {
    title: "Interview Prep",
    description: "Practice answering common interview questions with confidence.",
    icon: Briefcase,
    color: "teal" as const,
    mode: "interview",
  },
  {
    title: "Debate Partner",
    description: "Argue your point on topics like social media regulation and online education.",
    icon: Swords,
    color: "coral" as const,
    mode: "debate",
  },
  {
    title: "Group Discussion",
    description: "Simulate multi-speaker discussions on technology, climate change, and AI.",
    icon: Users,
    color: "purple" as const,
    mode: "group_discussion",
  },
];

const Dashboard = () => {
  const { user } = useAuth();
  

  const { data: sessions } = useQuery({
    queryKey: ["sessions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("sessions")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const totalSessions = sessions?.length || 0;
  const avgFluency = sessions?.length
    ? Math.round(sessions.reduce((sum, s) => sum + (s.fluency_score || 0), 0) / sessions.length)
    : 0;

  // Calculate streak
  const calculateStreak = () => {
    if (!sessions?.length) return 0;
    const dates = [...new Set(sessions.map(s => new Date(s.created_at).toDateString()))];
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (dates.includes(d.toDateString())) {
        streak++;
      } else if (i > 0) break;
    }
    return streak;
  };

  const sessionsByMode = (mode: string) =>
    sessions?.filter(s => s.mode === mode).length || 0;

  const stats = [
    { label: "Sessions", value: totalSessions.toString(), icon: Clock },
    { label: "Streak", value: `${calculateStreak()} days`, icon: Flame },
    { label: "Fluency", value: avgFluency ? `${avgFluency}%` : "—", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-3xl font-extrabold text-foreground">
            Welcome back, {profile?.display_name || "learner"}! 👋
          </h1>
          <p className="mt-1 text-muted-foreground">Choose a practice mode to get started.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 grid grid-cols-3 gap-4"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="rounded-xl bg-secondary p-2.5">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Daily Challenge */}
        <DailyChallenge />

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">AI Practice Modes</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {modes.map((mode, i) => (
              <motion.div
                key={mode.mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <ModeCard {...mode} sessions={sessionsByMode(mode.mode)} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
