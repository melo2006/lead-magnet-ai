import { motion } from "framer-motion";
import { niches, type NicheData } from "@/data/nicheData";

interface NicheSelectorProps {
  selected: NicheData;
  onSelect: (niche: NicheData) => void;
}

const NicheSelector = ({ selected, onSelect }: NicheSelectorProps) => {
  return (
    <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
          <span className="text-xs text-muted-foreground whitespace-nowrap mr-2 hidden sm:inline">Your industry:</span>
          {niches.map((niche) => (
            <motion.button
              key={niche.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(niche)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selected.id === niche.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <span>{niche.icon}</span>
              <span>{niche.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NicheSelector;
