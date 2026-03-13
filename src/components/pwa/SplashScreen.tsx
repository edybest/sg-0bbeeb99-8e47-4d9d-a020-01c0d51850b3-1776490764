import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { Volume2, VolumeX } from "lucide-react";

interface SplashScreenProps {
  onComplete?: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const DEFAULT_TAGLINE = "Selamat Datang! Jom main boling";
  const [tagline, setTagline] = useState<string>(DEFAULT_TAGLINE);

  const [parallax, setParallax] = useState<{ x: number; y: number; s: number }>({
    x: 0,
    y: 0,
    s: 0,
  });

  useEffect(() => {
    if (shouldReduceMotion) return;

    const handleScroll = () => {
      const y = typeof window === "undefined" ? 0 : Math.min(18, window.scrollY * 0.06);
      setParallax((p) => ({ ...p, s: y }));
    };

    const handlePointerMove = (e: PointerEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      const nx = (e.clientX - w / 2) / (w / 2);
      const ny = (e.clientY - h / 2) / (h / 2);

      const x = Math.max(-14, Math.min(14, nx * 14));
      const y = Math.max(-10, Math.min(10, ny * 10));
      setParallax((p) => ({ ...p, x, y }));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [shouldReduceMotion]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      setTagline("Selamat Pagi! Mari bermain boling bersama");
    } else if (hour >= 12 && hour < 17) {
      setTagline("Selamat Tengahari! Masa untuk strike");
    } else if (hour >= 17 && hour < 19) {
      setTagline("Selamat Petang! Jom main boling");
    } else {
      setTagline("Selamat Malam! Boling membawa kita bersama");
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && soundEnabled) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [soundEnabled]);

  const playRollingSound = () => {
    if (!audioContextRef.current || !soundEnabled) return;

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(60, now);
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

  const playStrikeSound = () => {
    if (!audioContextRef.current || !soundEnabled) return;

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    for (let i = 0; i < 5; i++) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(300 + Math.random() * 200, now + i * 0.05);

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
    if (soundEnabled) {
      playRollingSound();

      const strikeTimer = setTimeout(() => {
        playStrikeSound();
      }, 1500);

      return () => clearTimeout(strikeTimer);
    }
  }, [soundEnabled]);

  useEffect(() => {
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

  const overlayVariants = {
    initial: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const shimmerVariants = shouldReduceMotion
    ? {}
    : {
        animate: {
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        },
      };

  const logoFloatVariants = shouldReduceMotion
    ? { animate: { y: 0 } }
    : {
        animate: {
          y: [0, -6, 0],
        },
      };

  const glowVariants = shouldReduceMotion
    ? { animate: { opacity: 0.25, scale: 1.5 } }
    : {
        animate: {
          opacity: [0.15, 0.35, 0.2],
          scale: [1.45, 1.6, 1.5],
        },
      };

  const backgroundParallaxStyle = shouldReduceMotion
    ? undefined
    : ({
        transform: `translate3d(${parallax.x * 0.25}px, ${parallax.y * 0.25 + parallax.s * 0.35}px, 0)`,
      } as const);

  const logoParallaxStyle = shouldReduceMotion
    ? undefined
    : ({
        transform: `translate3d(${parallax.x * 0.55}px, ${parallax.y * 0.6 + parallax.s * 0.25}px, 0)`,
      } as const);

  const textParallaxStyle = shouldReduceMotion
    ? undefined
    : ({
        transform: `translate3d(${parallax.x * 0.35}px, ${parallax.y * 0.3 + parallax.s * 0.15}px, 0)`,
      } as const);

  const pinsParallaxStyle = shouldReduceMotion
    ? undefined
    : ({
        transform: `translate3d(${parallax.x * 0.2}px, ${parallax.y * 0.15 + parallax.s * 0.45}px, 0)`,
      } as const);

  const dotsParallaxStyle = shouldReduceMotion
    ? undefined
    : ({
        transform: `translate3d(${parallax.x * 0.15}px, ${parallax.y * 0.1 + parallax.s * 0.55}px, 0)`,
      } as const);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={overlayVariants}
          initial="initial"
          exit="exit"
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-4 overflow-hidden"
        >
          <motion.div
            style={backgroundParallaxStyle}
            className="absolute inset-0 bg-[length:200%_200%] bg-gradient-to-br from-red-600 via-red-700 to-red-800"
            variants={shimmerVariants as any}
            animate="animate"
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(0,0,0,0.25),transparent_60%)]" />

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm z-10"
            aria-label={soundEnabled ? "Mute sound" : "Enable sound"}
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            ) : (
              <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 text-white/70" />
            )}
          </motion.button>

          <motion.div
            variants={logoFloatVariants}
            animate="animate"
            transition={{
              duration: 3.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative mb-6 sm:mb-8 md:mb-10 lg:mb-12 z-10"
            style={logoParallaxStyle}
          >
            <motion.div
              variants={glowVariants}
              animate="animate"
              transition={{
                duration: 2.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 blur-2xl sm:blur-3xl bg-white/20 rounded-full"
            />

            <motion.div
              initial={{ scale: 0.85, opacity: 0, filter: "blur(8px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              transition={{
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48"
            >
              <Image
                src="/ambc-logo.png"
                alt="AMBC Club Logo"
                fill
                className="object-contain drop-shadow-2xl"
                priority
              />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ y: 18, opacity: 0, filter: "blur(8px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            transition={{
              delay: 0.25,
              duration: 0.7,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="text-center px-4 sm:px-6 md:px-8 max-w-xl z-10"
            style={textParallaxStyle}
          >
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3 tracking-tight">
              AMBC Club
            </h1>

            <p className="text-white/95 text-sm sm:text-base md:text-lg lg:text-xl font-light italic tracking-wide leading-relaxed">
              {tagline}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="absolute bottom-16 sm:bottom-20 md:bottom-24 flex gap-1.5 sm:gap-2 md:gap-3 z-10"
            style={pinsParallaxStyle}
          >
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                animate={
                  shouldReduceMotion
                    ? { y: 0, rotate: 0 }
                    : { y: [0, -7, 0], rotate: [0, i % 2 === 0 ? -2 : 2, 0] }
                }
                transition={{
                  duration: 1.25,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
                className="w-1.5 h-5 sm:w-2 sm:h-6 md:w-2.5 md:h-7 bg-white/80 rounded-full"
              />
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85 }}
            className="absolute bottom-6 sm:bottom-8 md:bottom-10 z-10"
            style={dotsParallaxStyle}
          >
            <div className="flex gap-1 sm:gap-1.5">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={
                    shouldReduceMotion
                      ? { opacity: 0.8, y: 0 }
                      : { y: [0, -3, 0], opacity: [0.45, 1, 0.45] }
                  }
                  transition={{
                    duration: 0.95,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut",
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