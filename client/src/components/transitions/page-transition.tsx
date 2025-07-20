import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { usePageTransition } from "@/hooks/usePageTransition";

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const [location] = useLocation();
  const { direction, shouldAnimate, onAnimationComplete } = usePageTransition();

  // Animation variants with improved easing
  const variants = {
    enter: (direction: string) => ({
      x: direction === 'left' ? '100%' : direction === 'right' ? '-100%' : 0,
      opacity: 1,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: string) => ({
      x: direction === 'left' ? '-100%' : direction === 'right' ? '100%' : 0,
      opacity: 1,
    }),
  };

  // If should not animate, render without animation
  if (!shouldAnimate) {
    return <>{children}</>;
  }

  return (
    <div className="relative overflow-hidden min-h-full">
      <AnimatePresence mode="wait" custom={direction} onExitComplete={onAnimationComplete}>
        <motion.div
          key={location}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            type: "tween",
            ease: [0.25, 0.46, 0.45, 0.94],
            duration: 0.3,
          }}
          className="w-full min-h-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}