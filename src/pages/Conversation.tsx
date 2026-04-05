import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, PhoneOff, Bot, User, Volume2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import LevelSelector, { type ProficiencyLevel } from "@/components/LevelSelector";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const modeLabels: Record<string, string> = {
  interview: "Interview Prep",
  debate: "Debate Partner",
  conversation: "Daily Conversation",
  group_discussion: "Group Discussion",
};

interface Message {
  role: "ai" | "user";
  text: string;
  speaker?: string;
}

const SPEAKERS: Record<string, { color: string; bg: string; emoji: string }> = {
  Alex: { color: "text-primary", bg: "bg-primary", emoji: "🧑‍💻" },
  Priya: { color: "text-coral", bg: "bg-coral", emoji: "👩‍🔬" },
  Sam: { color: "text-gold", bg: "bg-gold", emoji: "🧑‍🎨" },
  Jordan: { color: "text-purple-soft", bg: "bg-purple-soft", emoji: "🧑‍⚖️" },
};

const Conversation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "conversation";
  const isGroupMode = mode === "group_discussion";
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [level, setLevel] = useState<ProficiencyLevel | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatHistoryRef = useRef<{ role: string; content: string }[]>([]);

  useEffect(() => {
    if (!sessionStarted) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [sessionStarted]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveTranscript]);

  const parseGroupResponse = (content: string): { speaker: string; text: string }[] => {
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fallback: try to parse "Speaker: text" format
      const lines = content.split("\n").filter(Boolean);
      const results: { speaker: string; text: string }[] = [];
      for (const line of lines) {
        const match = line.match(/^(Alex|Priya|Sam|Jordan):\s*(.+)/i);
        if (match) {
          results.push({ speaker: match[1], text: match[2] });
        }
      }
      if (results.length > 0) return results;
    }
    return [{ speaker: "Alex", text: content }];
  };

  const browserTTS = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 1;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      synth.speak(utterance);
    });
  };

  const playTTS = async (text: string) => {
    setIsAiSpeaking(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ text }),
      });

      const contentType = response.headers.get("content-type") || "";

      if (!response.ok || contentType.includes("application/json")) {
        throw new Error("Use browser fallback");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });

      URL.revokeObjectURL(audioUrl);
    } catch {
      await browserTTS(text);
    } finally {
      setIsAiSpeaking(false);
      setActiveSpeaker(null);
    }
  };

  const playGroupMessages = async (speakers: { speaker: string; text: string }[]) => {
    for (const entry of speakers) {
      setActiveSpeaker(entry.speaker);
      await playTTS(entry.text);
    }
  };

  const handleAIResponse = async (content: string) => {
    if (isGroupMode) {
      const speakers = parseGroupResponse(content);
      const newMessages: Message[] = speakers.map((s) => ({
        role: "ai" as const,
        text: s.text,
        speaker: s.speaker,
      }));
      setMessages((prev) => [...prev, ...newMessages]);
      chatHistoryRef.current.push({ role: "assistant", content });
      await playGroupMessages(speakers);
    } else {
      const aiMsg: Message = { role: "ai", text: content };
      setMessages((prev) => [...prev, aiMsg]);
      chatHistoryRef.current.push({ role: "assistant", content });
      await playTTS(content);
    }
  };

  const handleStartSession = () => {
    if (!level) return;
    sessionStorage.setItem("session_level", level);
    setSessionStarted(true);
  };

  // Start conversation with AI greeting
  useEffect(() => {
    if (!sessionStarted) return;
    const greet = async () => {
      setIsProcessing(true);
      try {
        const levelHint = level === "beginner" ? "Use simple words and short sentences. Speak slowly." 
          : level === "advanced" ? "Use complex vocabulary and nuanced topics." 
          : "Use moderate vocabulary and conversational tone.";
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: `Start the conversation. Greet me and begin. The student's level is ${level}. ${levelHint}` }],
            mode,
          }),
        });
        const data = await resp.json();
        if (data.content) {
          chatHistoryRef.current = [];
          await handleAIResponse(data.content);
        }
      } catch (e) {
        console.error("Greeting error:", e);
        const fallback: Message = { role: "ai", text: "Hi there! Let's practice. Tell me something about yourself." };
        setMessages([fallback]);
        chatHistoryRef.current = [{ role: "assistant", content: fallback.text }];
      } finally {
        setIsProcessing(false);
      }
    };
    greet();
  }, [mode, sessionStarted]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const sendToAI = async (userText: string) => {
    setIsProcessing(true);
    chatHistoryRef.current.push({ role: "user", content: userText });

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          messages: chatHistoryRef.current,
          mode,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json();
        toast({ variant: "destructive", title: "Error", description: errData.error || "AI response failed" });
        return;
      }

      const data = await resp.json();
      if (data.content) {
        await handleAIResponse(data.content);
      }
    } catch (e) {
      console.error("AI error:", e);
      toast({ variant: "destructive", title: "Connection error", description: "Could not reach AI. Try again." });
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ variant: "destructive", title: "Not supported", description: "Speech recognition not available in this browser." });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      setLiveTranscript(interim);
      if (final) {
        const userMsg: Message = { role: "user", text: final.trim() };
        setMessages((prev) => [...prev, userMsg]);
        setLiveTranscript("");
        sendToAI(final.trim());
        recognition.stop();
        setIsRecording(false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech error:", event.error);
      setIsRecording(false);
      setLiveTranscript("");
    };

    recognition.onend = () => {
      setIsRecording(false);
      setLiveTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [toast]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    setLiveTranscript("");
  }, []);

  const handleMicToggle = () => {
    if (isAiSpeaking || isProcessing) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleEnd = () => {
    recognitionRef.current?.stop();
    audioRef.current?.pause();
    sessionStorage.setItem("session_transcript", JSON.stringify(messages));
    navigate(`/feedback?mode=${mode}&duration=${seconds}`);
  };

  const getSpeakerInfo = (speaker?: string) => {
    if (!speaker) return null;
    return SPEAKERS[speaker] || SPEAKERS.Alex;
  };

  if (!sessionStarted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-8 text-center">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-foreground">{modeLabels[mode]}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Choose your English proficiency level</p>
          </div>
          <LevelSelector selected={level} onSelect={setLevel} />
          <Button size="lg" className="w-full" disabled={!level} onClick={handleStartSession}>
            Start Session <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur-md">
        <div>
          <p className="font-display text-sm font-bold text-primary">{modeLabels[mode]}</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">{formatTime(seconds)}</p>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary capitalize">
              {level}
            </span>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={handleEnd}>
          <PhoneOff className="mr-1 h-4 w-4" />
          End
        </Button>
      </div>

      {/* Participants bar for group mode */}
      {isGroupMode && (
        <div className="flex items-center gap-3 border-b border-border bg-card/50 px-4 py-2">
          {Object.entries(SPEAKERS).map(([name, info]) => (
            <div
              key={name}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                activeSpeaker === name
                  ? `${info.bg} text-white shadow-md scale-105`
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span>{info.emoji}</span>
              <span>{name}</span>
              {activeSpeaker === name && (
                <Volume2 className="h-3 w-3 animate-pulse" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-lg space-y-4">
          <AnimatePresence>
            {messages.map((msg, i) => {
              const speakerInfo = getSpeakerInfo(msg.speaker);
              const isUser = msg.role === "user";

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                      isUser
                        ? "bg-accent"
                        : speakerInfo
                        ? speakerInfo.bg
                        : "bg-primary"
                    }`}
                  >
                    {isUser ? (
                      <User className="h-4 w-4 text-accent-foreground" />
                    ) : speakerInfo ? (
                      <span>{speakerInfo.emoji}</span>
                    ) : (
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    )}
                  </div>
                  <div className="max-w-[80%]">
                    {msg.speaker && (
                      <p className={`mb-0.5 text-xs font-semibold ${speakerInfo?.color || "text-primary"}`}>
                        {msg.speaker}
                      </p>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm ${
                        isUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-card-foreground shadow-card"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Live transcript */}
          {liveTranscript && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3 flex-row-reverse"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent">
                <User className="h-4 w-4 text-accent-foreground" />
              </div>
              <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground italic">
                {liveTranscript}...
              </div>
            </motion.div>
          )}

          {/* Processing indicator */}
          {isProcessing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="rounded-2xl bg-card px-4 py-3 shadow-card">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Mic button */}
      <div className="border-t border-border bg-card/80 px-4 py-6 backdrop-blur-md">
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs text-muted-foreground">
            {isAiSpeaking ? (
              <span className="flex items-center gap-1">
                <Volume2 className="h-3 w-3 animate-pulse" />
                {activeSpeaker ? `${activeSpeaker} is speaking...` : "AI is speaking..."}
              </span>
            ) : isProcessing ? (
              "Thinking..."
            ) : isRecording ? (
              "Listening... tap to stop"
            ) : (
              "Tap to speak"
            )}
          </p>
          <button
            onClick={handleMicToggle}
            disabled={isAiSpeaking || isProcessing}
            className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 disabled:opacity-50 ${
              isRecording
                ? "bg-accent animate-mic-pulse"
                : "bg-primary hover:shadow-elevated"
            }`}
          >
            {isRecording && (
              <>
                <span className="absolute inset-0 rounded-full bg-accent/30 animate-mic-ring" />
                <span className="absolute inset-0 rounded-full bg-accent/15 animate-mic-ring" style={{ animationDelay: "0.5s" }} />
              </>
            )}
            {isRecording ? (
              <MicOff className="relative z-10 h-8 w-8 text-accent-foreground" />
            ) : (
              <Mic className="relative z-10 h-8 w-8 text-primary-foreground" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Conversation;
