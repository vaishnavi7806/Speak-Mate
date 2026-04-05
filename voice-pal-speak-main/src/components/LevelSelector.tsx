import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";

export type ProficiencyLevel = "beginner" | "intermediate" | "advanced";

interface LevelOption {
  value: ProficiencyLevel;
  label: string;
  description: string;
  emoji: string;
}

const levels: LevelOption[] = [
  { value: "beginner", label: "Beginner", description: "Simple topics & slow pace", emoji: "🌱" },
  { value: "intermediate", label: "Intermediate", description: "General discussion & varied vocab", emoji: "📚" },
  { value: "advanced", label: "Advanced", description: "Debates, opinions & complex ideas", emoji: "🚀" },
];

interface LevelSelectorProps {
  selected: ProficiencyLevel | null;
  onSelect: (level: ProficiencyLevel) => void;
}

const LevelSelector = ({ selected, onSelect }: LevelSelectorProps) => {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-2 text-primary">
        <GraduationCap className="h-6 w-6" />
        <h2 className="font-display text-lg font-bold text-foreground">Select Your Level</h2>
      </div>
      <div className="grid w-full max-w-md grid-cols-3 gap-3">
        {levels.map((level, i) => {
          const isSelected = selected === level.value;
          return (
            <motion.button
              key={level.value}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => onSelect(level.value)}
              className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-elevated"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span className="text-2xl">{level.emoji}</span>
              <span className="font-display text-sm font-bold text-foreground">{level.label}</span>
              <span className="text-center text-[11px] leading-tight text-muted-foreground">{level.description}</span>
              {isSelected && (
                <motion.div
                  layoutId="level-indicator"
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default LevelSelector;
