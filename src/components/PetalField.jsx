import React, { useMemo } from "react";
import { useMotionPreferences } from "../hooks/useMotionPreferences";
import "../styles/PetalField.css";

function generatePetals(count) {
  return Array.from({ length: count }, (_, index) => {
    const size = 0.65 + Math.random() * 0.7;
    const delay = Math.random() * 6;
    const duration = 8 + Math.random() * 6;
    const horizontal = Math.random() * 100;
    const startY = -60 - Math.random() * 30;
    const endY = 110 + Math.random() * 40;
    const sway = (Math.random() - 0.5) * 40;
    const scale = 0.9 + Math.random() * 0.35;

    return {
      id: `petal-${index}-${horizontal.toFixed(2)}`,
      size,
      delay,
      duration,
      horizontal,
      rotation: Math.random() * 360,
      startY,
      endY,
      sway,
      scale,
    };
  });
}

export default function PetalField({ isPlaying = false, intensity = 1, petalCount = 18, tintColor, progress = 0 }) {
  const prefersReducedMotion = useMotionPreferences();

  const petals = useMemo(() => {
    if (prefersReducedMotion) {
      return [];
    }
    const intensityMultiplier = Math.max(0.6, intensity + progress * 0.4);
    const baseCount = Math.max(petalCount, 12);
    const cappedCount = Math.max(0, Math.round(baseCount * intensityMultiplier));
    return generatePetals(cappedCount);
  }, [intensity, petalCount, prefersReducedMotion, progress]);

  if (!isPlaying || petals.length === 0) {
    return null;
  }

  return (
    <div className="petal-field" style={tintColor ? { "--petal-accent": tintColor } : undefined} aria-hidden="true">
      {petals.map((petal) => (
        <div
          key={petal.id}
          className="petal-field__petal"
          style={{
            "--petal-size": `${petal.size}rem`,
            "--petal-delay": `${petal.delay}s`,
            "--petal-duration": `${petal.duration}s`,
            "--petal-horizontal": `${petal.horizontal}%`,
            "--petal-rotation": `${petal.rotation}deg`,
            "--petal-start-y": `${petal.startY}%`,
            "--petal-end-y": `${petal.endY}%`,
            "--petal-sway": `${petal.sway}%`,
            "--petal-scale": petal.scale,
          }}
        />
      ))}
    </div>
  );
}
