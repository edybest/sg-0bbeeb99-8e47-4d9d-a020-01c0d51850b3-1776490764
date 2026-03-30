import { cn } from "@/lib/utils";
import Image from "next/image";
import { motion } from "framer-motion";

interface BowlingBallLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function BowlingBallLoader({ className, size = "md" }: BowlingBallLoaderProps) {
  const sizeClasses = {
    sm: "w-12 h-12 sm:w-16 sm:h-16",
    md: "w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28",
    lg: "w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40"
  };

  const animationSpeed = {
    sm: "1.2s",
    md: "1.5s",
    lg: "1.8s"
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <div 
        className={cn("relative logo-flip", sizeClasses[size])}
        style={{ animationDuration: animationSpeed[size] }}
      >
        <Image
          src="/ambc-logo.png"
          alt="AMBC Club"
          fill
          className="object-contain"
          sizes="(max-width: 640px) 96px, (max-width: 768px) 112px, 160px"
        />
      </div>

      <style jsx>{`
        .logo-flip {
          animation: flip ease-in-out infinite;
          transform-style: preserve-3d;
          will-change: transform;
        }

        @keyframes flip {
          0% {
            transform: perspective(400px) rotateY(0deg);
            opacity: 1;
          }
          25% {
            transform: perspective(400px) rotateY(90deg);
            opacity: 0.5;
          }
          50% {
            transform: perspective(400px) rotateY(180deg);
            opacity: 1;
          }
          75% {
            transform: perspective(400px) rotateY(270deg);
            opacity: 0.5;
          }
          100% {
            transform: perspective(400px) rotateY(360deg);
            opacity: 1;
          }
        }

        @media (max-width: 640px) {
          .logo-flip {
            animation-duration: 1.2s !important;
          }
        }
      `}</style>
    </div>
  );
}

// Full-screen loading overlay version with responsive sizing
export function BowlingBallLoaderOverlay() {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="flex flex-col items-center gap-3 sm:gap-4">
        <BowlingBallLoader size="sm" />
        <p className="text-sm sm:text-base md:text-sm font-medium text-muted-foreground animate-pulse text-center">
          Loading...
        </p>
      </div>
    </div>
  );
}