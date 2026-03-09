import { motion } from "framer-motion";
import logo from "@/assets/quantummom-logo.png";

interface Props {
  subtitle?: string;
  compact?: boolean;
}

const QuantumMomHeader = ({ subtitle, compact = false }: Props) => {
  return (
    <div className={`gradient-hero px-6 ${compact ? "py-6" : "py-10"} text-center relative overflow-hidden`}>
      {/* Decorative floating circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-primary-foreground/5 blur-2xl" />
        <div className="absolute -bottom-10 -right-10 h-52 w-52 rounded-full bg-primary-foreground/8 blur-3xl" />
        <div className="absolute top-1/2 left-1/4 h-20 w-20 rounded-full bg-primary-foreground/5 blur-xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex flex-col items-center gap-3"
      >
        <motion.img
          src={logo}
          alt="QuantumMom Logo"
          className={`${compact ? "h-14 w-14" : "h-20 w-20"} drop-shadow-lg`}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        />

        <div>
          <motion.h1
            className={`font-display font-extrabold tracking-tight text-primary-foreground ${compact ? "text-3xl" : "text-4xl md:text-5xl"}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="relative">
              Quantum
              <span className="text-accent">Mom</span>
              {/* Sparkle decorations */}
              <motion.span
                className="absolute -top-2 -right-4 text-accent text-lg"
                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ✦
              </motion.span>
            </span>
          </motion.h1>

          {subtitle && (
            <motion.p
              className={`mt-1.5 text-primary-foreground/75 ${compact ? "text-sm" : "text-base md:text-lg"} font-medium`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              {subtitle}
            </motion.p>
          )}

          {!compact && (
            <motion.div
              className="mt-3 flex items-center justify-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
            >
              {["AI Health Prediction", "Quantum Optimization", "Emergency Alerts"].map((tag, i) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold text-primary-foreground/90 backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default QuantumMomHeader;
