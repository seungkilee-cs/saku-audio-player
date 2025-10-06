import React, { useMemo } from "react";
import { useMotionPreferences } from "../hooks/useMotionPreferences";
import "../styles/PetalField.css";

function generatePetals(count) {
  return Array.from({ length: count }, (_, index) => {
    const size = 0.65 + Math.random() * 0.7;
    const delay = Math.random() * 6;
    const duration = 8 + Math.random() * 6;
    const horizontal = Math.random() * 100;

    return {
      id: `petal-${index}-${horizontal.toFixed(2)}`,
      size,
      delay,
      duration,
      horizontal,
      rotation: Math.random() * 360,
    };
  });
}

export default function PetalField({ isPlaying = false, intensity = 1, petalCount = 12, tintColor, progress = 0 }) {
  const prefersReducedMotion = useMotionPreferences();

  const petals = useMemo(() => {
    if (prefersReducedMotion) {
      return [];
    }
    const cappedCount = Math.max(0, Math.round(petalCount * intensity));
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
          }}
        />
      ))}
    </div>
  );
}
