import { animate, useMotionValue, useTransform, motion } from "framer-motion";
import { useEffect } from "react";

export function NumberValue({ value, prefix = "", suffix = "", decimals = 0, className = "" }: { value: number; prefix?: string; suffix?: string; decimals?: number; className?: string }) {
  const motionValue = useMotionValue(value);
  const display = useTransform(motionValue, (current) => `${prefix}${current.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`);
  useEffect(() => { const controls = animate(motionValue, value, { duration: .4, ease: "easeOut" }); return controls.stop; }, [motionValue, value]);
  return <motion.span className={`number ${className}`}>{display}</motion.span>;
}
