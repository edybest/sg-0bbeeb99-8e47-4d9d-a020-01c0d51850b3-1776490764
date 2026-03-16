<![CDATA[import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

export function ParticleBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Feminine color palette for particles
  const colors = [
    "rgba(232, 139, 166, 0.4)", // Soft Rose
    "rgba(183, 148, 246, 0.4)", // Lavender
    "rgba(255, 168, 118, 0.4)", // Peach
    "rgba(232, 196, 104, 0.3)", // Gold
    "rgba(255, 192, 203, 0.3)", // Pink
  ];

  // Generate random particles
  const generateParticles = (): Particle[] => {
    const particleCount = 20;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 100 + 50, // 50-150px
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: Math.random() * 20 + 15, // 15-35s
        delay: Math.random() * 5,
      });
    }

    return particles;
  };

  const particles = generateParticles();

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* Gradient Orbs */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full blur-3xl"
          style={{
            width: particle.size,
            height: particle.size,
            background: `radial-gradient(circle, ${particle.color} 0%, transparent 70%)`,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            x: [0, Math.random() * 100 - 50, 0],
            y: [0, Math.random() * 100 - 50, 0],
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Floating Sparkles */}
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={`sparkle-${i}`}
          className="absolute w-1 h-1 bg-gradient-to-r from-rose-300 to-purple-300 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: Math.random() * 4 + 3,
            delay: Math.random() * 5,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Shimmer Effect */}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(232, 139, 166, 0.05) 0%, transparent 70%)",
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
</![CDATA[>
