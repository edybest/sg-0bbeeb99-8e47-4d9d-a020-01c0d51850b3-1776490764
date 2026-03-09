import { cn } from "@/lib/utils";

interface BowlingBallLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function BowlingBallLoader({ className, size = "md" }: BowlingBallLoaderProps) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-24 h-24"
  };

  const holeSizes = {
    sm: { outer: 8, inner: 3 },
    md: { outer: 12, inner: 4 },
    lg: { outer: 16, inner: 6 }
  };

  const holes = holeSizes[size];

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <div className={cn(
        "relative rounded-full bg-gradient-to-br from-red-500 via-red-600 to-red-800 shadow-2xl",
        sizeClasses[size],
        "animate-spin"
      )}>
        {/* Shine effect */}
        <div className="absolute top-2 left-2 w-1/3 h-1/3 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-sm" />
        
        {/* Finger holes */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Top hole */}
          <div 
            className="absolute rounded-full bg-black shadow-inner"
            style={{
              width: `${holes.outer}px`,
              height: `${holes.outer}px`,
              top: "25%",
              left: "50%",
              transform: "translateX(-50%)"
            }}
          >
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-900"
              style={{
                width: `${holes.inner}px`,
                height: `${holes.inner}px`
              }}
            />
          </div>
          
          {/* Bottom left hole */}
          <div 
            className="absolute rounded-full bg-black shadow-inner"
            style={{
              width: `${holes.outer}px`,
              height: `${holes.outer}px`,
              bottom: "30%",
              left: "35%"
            }}
          >
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-900"
              style={{
                width: `${holes.inner}px`,
                height: `${holes.inner}px`
              }}
            />
          </div>
          
          {/* Bottom right hole */}
          <div 
            className="absolute rounded-full bg-black shadow-inner"
            style={{
              width: `${holes.outer}px`,
              height: `${holes.outer}px`,
              bottom: "30%",
              right: "35%"
            }}
          >
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-900"
              style={{
                width: `${holes.inner}px`,
                height: `${holes.inner}px`
              }}
            />
          </div>
        </div>

        {/* Shadow effect on bottom */}
        <div className="absolute -bottom-1 left-0 right-0 h-1/4 bg-gradient-to-t from-black/30 to-transparent rounded-full blur-sm" />
      </div>

      {/* Spinning shadow underneath */}
      <div className={cn(
        "absolute -bottom-2 rounded-full bg-black/20 blur-md animate-pulse",
        size === "sm" && "w-10 h-3",
        size === "md" && "w-14 h-4",
        size === "lg" && "w-20 h-6"
      )} />
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