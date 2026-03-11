import { cn } from "@/lib/utils";
import Image from "next/image";

interface BowlingBallLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function BowlingBallLoader({ className, size = "md" }: BowlingBallLoaderProps) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32"
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <div className={cn("relative logo-flip", sizeClasses[size])}>
        <Image
          src="/ambc-logo.png"
          alt="AMBC Club"
          fill
          className="object-contain"
          priority
        />
      </div>

      <style jsx>{`
        .logo-flip {
          animation: flip 1.5s ease-in-out infinite;
          transform-style: preserve-3d;
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
      `}</style>
    </div>
  );
}

// Full-screen loading overlay version
export function BowlingBallLoaderOverlay() {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <BowlingBallLoader size="lg" />
        <p className="text-lg font-medium text-muted-foreground animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}