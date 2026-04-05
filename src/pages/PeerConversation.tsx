import { startVoiceCall } from "../VoiceCall";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type MatchStatus = "idle" | "searching" | "matched" | "timeout";

const PeerConversation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [matchStatus, setMatchStatus] = useState<MatchStatus>("matched");

  // ✅ FIXED STATES
  const [isPartnerConnected, setIsPartnerConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const handleSessionEnd = () => {
    navigate("/dashboard");
  };

  // Waiting screen (kept simple)
  if (matchStatus !== "matched") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <h1>Waiting...</h1>
      </div>
    );
  }

  // ✅ REAL CONVERSATION UI
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white">

      {/* Title */}
      <h1 className="text-2xl font-bold mb-6">Real Conversation</h1>

      {/* Timer */}
      <p className="text-sm text-gray-400 mb-4">
        ⏱ {formatTime(seconds)}
      </p>

      {/* Users */}
      <div className="flex gap-12 mb-10">

        {/* You */}
        <div className="flex flex-col items-center">
          <div className={`h-24 w-24 rounded-full flex items-center justify-center text-xl font-bold
            ${isListening ? "bg-green-500 animate-pulse" : "bg-gray-600"}`}>
            You
          </div>
          <p className="mt-2 text-sm">You</p>
        </div>

        {/* Partner */}
        <div className="flex flex-col items-center">
          <div className={`h-24 w-24 rounded-full flex items-center justify-center text-xl font-bold
            ${isSpeaking ? "bg-blue-500 animate-pulse" : "bg-gray-600"}`}>
            P
          </div>
          <p className="mt-2 text-sm">Partner</p>
        </div>

      </div>

      {/* ✅ FIXED STATUS */}
      <p className="text-gray-400 mb-6">
        {isPartnerConnected
          ? "🟢 Partner connected • Start talking"
          : "⏳ Waiting for partner to join..."}
      </p>

      {/* Controls */}
      <div className="flex gap-6">

        {/* ✅ FIXED BUTTON */}
        <button
          onClick={() => startVoiceCall(setIsPartnerConnected)}
          className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 rounded-full font-semibold"
        >
          🎤 Start
        </button>

        <button
          onClick={() => setIsListening(!isListening)}
          className="bg-gray-600 px-6 py-3 rounded-full"
        >
          {isListening ? "🔇 Mute" : "🎙 Speak"}
        </button>

        <button
          onClick={handleSessionEnd}
          className="bg-red-500 px-6 py-3 rounded-full"
        >
          ❌ End
        </button>

      </div>

    </div>
  );
};

export default PeerConversation;