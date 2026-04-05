import { motion } from "framer-motion";
import { Mic, MessageCircle, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: Mic,
    title: "Voice Conversations",
    description: "Practice speaking with an AI that responds naturally like a real person.",
  },
  {
    icon: MessageCircle,
    title: "Multiple Modes",
    description: "Interview prep, debates, or casual daily conversation — pick your style.",
  },
  {
    icon: BarChart3,
    title: "Smart Feedback",
    description: "Get scored on fluency, confidence, and vocabulary after every session.",
  },
];

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <Mic className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-extrabold text-foreground">SpeakMate</span>
        </div>
        <Button variant="ghost" onClick={() => navigate("/login")}>
          Sign In
        </Button>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-16 text-center md:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="mb-4 inline-block rounded-full bg-secondary px-4 py-1.5 text-sm font-semibold text-secondary-foreground">
            🎤 AI-Powered English Practice
          </span>
          <h1 className="font-display text-4xl font-extrabold leading-tight text-foreground md:text-6xl">
            Speak English with
            <br />
            <span className="text-primary">Confidence</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Practice speaking English through real voice conversations with AI. 
            Get instant feedback on fluency, confidence, and vocabulary.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button variant="hero" size="xl" onClick={() => navigate("/login")}>
              Get Started Free
              <ArrowRight className="ml-1 h-5 w-5" />
            </Button>
          </div>
        </motion.div>

        {/* Animated mic illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mx-auto mt-16 flex items-center justify-center"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-mic-ring" />
            <div className="absolute inset-0 rounded-full bg-primary/5 animate-mic-ring" style={{ animationDelay: "0.5s" }} />
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-primary shadow-elevated">
              <Mic className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.15, duration: 0.5 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-card"
            >
              <div className="mb-3 inline-flex rounded-xl bg-secondary p-3">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © 2026 SpeakMate. Practice English with AI.
      </footer>
    </div>
  );
};

export default Landing;
