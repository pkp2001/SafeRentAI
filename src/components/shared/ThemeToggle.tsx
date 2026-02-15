import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-xl hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <motion.div
        initial={false}
        animate={{ rotate: theme === "dark" ? 180 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {theme === "dark" ? (
          <Sun className="w-5 h-5 text-warning-400" />
        ) : (
          <Moon className="w-5 h-5 text-dark-500" />
        )}
      </motion.div>
    </button>
  );
}

