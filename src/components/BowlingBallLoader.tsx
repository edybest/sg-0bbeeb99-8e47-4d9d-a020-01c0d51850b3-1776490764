import { cn } from "@/lib/utils";

interface BowlingPinLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function BowlingPinLoader({ className, size = "md" }: BowlingPinLoaderProps) {
  const sizeClasses = {
    sm: "w-32 h-20",
    md: "w-40 h-24",
    lg: "w-48 h-32"
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <div className={cn("relative flex items-end gap-2 justify-center", sizeClasses[size])}>
        {/* Pin 1 - Falls first */}
        <div className="pin-container" style={{ animationDelay: "0s" }}>
          <svg viewBox="0 0 40 100" className="w-8 h-20 pin-svg">
            {/* Pin body */}
            <defs>
              <linearGradient id="pinGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#f0f0f0" />
                <stop offset="100%" stopColor="#e0e0e0" />
              </linearGradient>
            </defs>
            
            {/* Base */}
            <ellipse cx="20" cy="95" rx="12" ry="4" fill="#d0d0d0" />
            
            {/* Main body */}
            <path
              d="M 12 95 Q 10 85 10 75 L 10 40 Q 10 25 15 15 Q 18 8 20 5 Q 22 8 25 15 Q 30 25 30 40 L 30 75 Q 30 85 28 95 Z"
              fill="url(#pinGradient1)"
              stroke="#c0c0c0"
              strokeWidth="0.5"
            />
            
            {/* Red stripes */}
            <ellipse cx="20" cy="30" rx="11" ry="3" fill="#dc2626" opacity="0.8" />
            <ellipse cx="20" cy="35" rx="11" ry="3" fill="#dc2626" opacity="0.8" />
            
            {/* Shine highlight */}
            <ellipse cx="15" cy="20" rx="4" ry="8" fill="white" opacity="0.4" />
          </svg>
        </div>

        {/* Pin 2 - Falls second */}
        <div className="pin-container" style={{ animationDelay: "0.3s" }}>
          <svg viewBox="0 0 40 100" className="w-8 h-20 pin-svg">
            <defs>
              <linearGradient id="pinGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#f0f0f0" />
                <stop offset="100%" stopColor="#e0e0e0" />
              </linearGradient>
            </defs>
            <ellipse cx="20" cy="95" rx="12" ry="4" fill="#d0d0d0" />
            <path
              d="M 12 95 Q 10 85 10 75 L 10 40 Q 10 25 15 15 Q 18 8 20 5 Q 22 8 25 15 Q 30 25 30 40 L 30 75 Q 30 85 28 95 Z"
              fill="url(#pinGradient2)"
              stroke="#c0c0c0"
              strokeWidth="0.5"
            />
            <ellipse cx="20" cy="30" rx="11" ry="3" fill="#dc2626" opacity="0.8" />
            <ellipse cx="20" cy="35" rx="11" ry="3" fill="#dc2626" opacity="0.8" />
            <ellipse cx="15" cy="20" rx="4" ry="8" fill="white" opacity="0.4" />
          </svg>
        </div>

        {/* Pin 3 - Falls third */}
        <div className="pin-container" style={{ animationDelay: "0.6s" }}>
          <svg viewBox="0 0 40 100" className="w-8 h-20 pin-svg">
            <defs>
              <linearGradient id="pinGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#f0f0f0" />
                <stop offset="100%" stopColor="#e0e0e0" />
              </linearGradient>
            </defs>
            <ellipse cx="20" cy="95" rx="12" ry="4" fill="#d0d0d0" />
            <path
              d="M 12 95 Q 10 85 10 75 L 10 40 Q 10 25 15 15 Q 18 8 20 5 Q 22 8 25 15 Q 30 25 30 40 L 30 75 Q 30 85 28 95 Z"
              fill="url(#pinGradient3)"
              stroke="#c0c0c0"
              strokeWidth="0.5"
            />
            <ellipse cx="20" cy="30" rx="11" ry="3" fill="#dc2626" opacity="0.8" />
            <ellipse cx="20" cy="35" rx="11" ry="3" fill="#dc2626" opacity="0.8" />
            <ellipse cx="15" cy="20" rx="4" ry="8" fill="white" opacity="0.4" />
          </svg>
        </div>
      </div>

      <style jsx>{`
        .pin-container {
          animation: pinFall 1.8s ease-in-out infinite;
          transform-origin: center bottom;
        }

        .pin-svg {
          filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
        }

        @keyframes pinFall {
          0%, 100% {
            transform: rotate(0deg) translateY(0);
            opacity: 1;
          }
          15% {
            transform: rotate(0deg) translateY(-4px);
            opacity: 1;
          }
          30% {
            transform: rotate(15deg) translateY(0);
            opacity: 1;
          }
          45% {
            transform: rotate(75deg) translateY(8px);
            opacity: 0.7;
          }
          60% {
            transform: rotate(90deg) translateY(12px);
            opacity: 0.3;
          }
          75% {
            transform: rotate(90deg) translateY(12px);
            opacity: 0;
          }
          90% {
            transform: rotate(0deg) translateY(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// Full-screen loading overlay version
export function BowlingPinLoaderOverlay() {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <BowlingPinLoader size="lg" />
        <p className="text-lg font-medium text-muted-foreground animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}