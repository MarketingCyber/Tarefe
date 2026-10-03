"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Scroll-triggered entrance for a section as it comes into view — signals
 * "new content starting here" once, not a repeated/ambient effect.
 * Motion's whileInView per taste-skill §5.C: lighter than GSAP ScrollTrigger
 * for a plain "fade up on enter", no pinning/scrubbing involved.
 */
export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
