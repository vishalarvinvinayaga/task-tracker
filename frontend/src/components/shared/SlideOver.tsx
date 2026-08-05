import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function SlideOver({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="glass-panel hud-scanline relative h-full w-full max-w-xl overflow-y-auto border-y-0 border-r-0 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-px"
          style={{ background: "linear-gradient(to bottom, transparent, var(--accent-via), transparent)" }}
        />
        {children}
      </motion.div>
    </motion.div>
  );
}
