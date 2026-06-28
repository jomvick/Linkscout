"use client";

import { useRef, useEffect } from "react";
import { useMotionValue, animate, useInView } from "framer-motion";

export default function AnimatedNumber({ value, duration = 1.8 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(motionVal, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        if (ref.current) {
          ref.current.textContent = Math.round(latest).toLocaleString("fr");
        }
      },
    });
    return controls.stop;
  }, [inView, value, duration, motionVal]);

  return <span ref={ref}>0</span>;
}
