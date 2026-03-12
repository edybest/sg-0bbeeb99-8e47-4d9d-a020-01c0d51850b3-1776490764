import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Volume2, VolumeX } from "lucide-react";

interface SplashScreenProps {
  onComplete?: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Dynamic tagline based on time of day in Malay
  const tagline = useMemo(() => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      return "Selamat Pagi! Mari bermain boling bersama";
    } else if (hour >= 12 && hour < 17) {
      return "Selamat Tengahari! Masa untuk strike";
    } else if (hour >= 17 && hour < 19) {
      return "Selamat Petang! Jom main boling";
    } else {
      return "Selamat Malam! Boling membawa kita bersama";
    }
  }, []);

  // Initialize Audio Context
  useEffect(() => {
    if (typeof window !== "undefined" && soundEnabled) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [soundEnabled]);

  // Play bowling ball rolling sound
  const playRollingSound = () => {
    if (!audioContextRef.current || !soundEnabled) return;

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    // Create oscillator for rolling rumble effect
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(60, now); // Low rumble
    oscillator.frequency.exponentialRampToValueAtTime(40, now + 1.5);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(200, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.1);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 1.2);
    gainNode.gain.linearRampToValueAtTime(0, now + 1.5);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + 1.5);
  };

  // Play strike/pins falling sound
  const playStrikeSound = () => {
    if (!audioContextRef.current || !soundEnabled) return;

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    // Create multiple oscillators for pin collision sounds
    for (let i = 0; i < 5; i++) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(
        300 + Math.random() * 200,
        now + i * 0.05
      );

      gainNode.gain.setValueAtTime(0, now + i * 0.05);
      gainNode.gain.linearRampToValueAtTime(0.2, now + i * 0.05 + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(now + i * 0.05);
      oscillator.stop(now + i * 0.05 + 0.3);
    }
  };

  useEffect(() => {
    // Play rolling sound when splash appears
    if (soundEnabled) {
      playRollingSound();
      
      // Play strike sound after 1.5 seconds
      const strikeTimer = setTimeout(() => {
        playStrikeSound();
      }, 1500);

      return () => clearTimeout(strikeTimer);
    }
  }, [soundEnabled]);

  useEffect(() => {
    // Auto-dismiss after 2.5 seconds or when window loads
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 2500);

    const handleLoad = () => {
      setIsVisible(false);
      onComplete?.();
    };

    if (document.readyState === "complete") {
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener("load", handleLoad);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-red-600 via-red-700 to-red-800 px-4"
        >
          {/* Sound Toggle Button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm"
            aria-label={soundEnabled ? "Mute sound" : "Enable sound"}
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            ) : (
              <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 text-white/70" />
            )}
          </motion.button>

          {/* Logo Container - Responsive sizing */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 0.6,
              ease: "easeOut",
            }}
            className="relative mb-6 sm:mb-8 md:mb-10 lg:mb-12"
          >
            {/* Glow effect behind logo - Responsive */}
            <div className="absolute inset-0 blur-2xl sm:blur-3xl bg-white/20 rounded-full scale-150" />
            
            {/* Logo - Responsive sizes */}
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48">
              <Image
                src="/ambc-logo.png"
                alt="AMBC Club Logo"
                fill
                className="object-contain drop-shadow-2xl"
                priority
              />
            </div>
          </motion.div>

          {/* Tagline - Responsive text and spacing */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              delay: 0.3,
              duration: 0.6,
              ease: "easeOut",
            }}
            className="text-center px-4 sm:px-6 md:px-8 max-w-xl"
          >
            {/* App Name - Responsive sizing */}
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3 tracking-tight">
              AMBC Club
            </h1>
            
            {/* Dynamic Tagline - Responsive sizing */}
            <p className="text-white/95 text-sm sm:text-base md:text-lg lg:text-xl font-light italic tracking-wide leading-relaxed">
              {tagline}
            </p>
          </motion.div>

          {/* Animated bowling pins - Responsive positioning and size */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="absolute bottom-16 sm:bottom-20 md:bottom-24 flex gap-1.5 sm:gap-2 md:gap-3"
          >
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
                className="w-1.5 h-5 sm:w-2 sm:h-6 md:w-2.5 md:h-7 bg-white/80 rounded-full"
              />
            ))}
          </motion.div>

          {/* Loading spinner - Responsive positioning and size */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="absolute bottom-6 sm:bottom-8 md:bottom-10"
          >
            <div className="flex gap-1 sm:gap-1.5">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                  className="w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-2.5 md:h-2.5 rounded-full bg-white"
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}