import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ModeCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: "teal" | "coral" | "gold" | "purple";
  mode: string;
  sessions: number;
}

const colorMap = {
  teal: {
    bg: "bg-teal-light",
    icon: "text-primary",
    border: "border-primary/20",
    hover: "hover:border-primary/40",
  },
  coral: {
    bg: "bg-coral-light",
    icon: "text-coral",
    border: "border-coral/20",
    hover: "hover:border-coral/40",
  },
  gold: {
    bg: "bg-gold-light",
    icon: "text-gold",
    border: "border-gold/20",
    hover: "hover:border-gold/40",
  },
  purple: {
    bg: "bg-purple-soft-light",
    icon: "text-purple-soft",
    border: "border-purple-soft/20",
    hover: "hover:border-purple-soft/40",
  },
};

const ModeCard = ({ title, description, icon: Icon, color, mode, sessions }: ModeCardProps) => {
  const navigate = useNavigate();
  const colors = colorMap[color];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/conversation?mode=${mode}`)}
      className={`cursor-pointer rounded-2xl border-2 ${colors.border} ${colors.hover} bg-card p-6 shadow-card transition-colors`}
    >
      <div className={`mb-4 inline-flex rounded-xl ${colors.bg} p-3`}>
        <Icon className={`h-6 w-6 ${colors.icon}`} />
      </div>
      <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <p className="mt-3 text-xs font-medium text-muted-foreground">
        {sessions} sessions completed
      </p>
    </motion.div>
  );
};

export default ModeCard;
