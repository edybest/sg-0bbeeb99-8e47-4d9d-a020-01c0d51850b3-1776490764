import { useEffect, useRef, forwardRef } from "react";

interface LaneSpinWheelProps {
  items: string[];
  rotation: number;
  isSpinning: boolean;
  onSpinClick: () => void;
}

export const LaneSpinWheel = forwardRef<HTMLCanvasElement, LaneSpinWheelProps>(
  ({ items, rotation, isSpinning, onSpinClick }, forwardedRef) => {
    const internalCanvasRef = useRef<HTMLCanvasElement>(null);
    
    // Custom vibrant colors matching the reference image
    const COLORS = [
      "#EF4444", // Red
      "#3B82F6", // Blue
      "#22C55E", // Green
      "#EAB308", // Yellow
      "#A855F7", // Purple
      "#06B6D4", // Cyan
      "#EC4899", // Pink
      "#F97316", // Orange
    ];
    
    // Internal canvas size (large for high resolution/retina display)
    const WHEEL_SIZE = 800; 
    const CENTER_RADIUS = 100;

    // Use internal ref to draw, but forward to parent for animation
    const canvasRef = (forwardedRef as React.RefObject<HTMLCanvasElement>) || internalCanvasRef;

    useEffect(() => {
      drawWheel();
    }, [items]); // Only redraw when items change to save performance

    const drawWheel = () => {
      const canvas = canvasRef.current;
      if (!canvas || items.length === 0) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const centerX = WHEEL_SIZE / 2;
      const centerY = WHEEL_SIZE / 2;
      const radius = (WHEEL_SIZE - 20) / 2; // Leave 10px margin
      const segmentAngle = (2 * Math.PI) / items.length;

      ctx.clearRect(0, 0, WHEEL_SIZE, WHEEL_SIZE);
      ctx.save();
      ctx.translate(centerX, centerY);
      
      // Draw segments
      items.forEach((item, index) => {
        const startAngle = index * segmentAngle;
        const endAngle = startAngle + segmentAngle;
        const color = COLORS[index % COLORS.length];

        // Draw segment
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        // Draw segment border (subtle white line between segments)
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw text
        ctx.save();
        // Rotate to center of segment
        ctx.rotate(startAngle + segmentAngle / 2);
        ctx.textAlign = "right"; // Align right to put text near outer edge
        ctx.textBaseline = "middle";
        
        // Dynamic font size handles many participants cleanly
        const fontSize = items.length > 50 ? 14 : items.length > 30 ? 20 : 28;
        ctx.font = `bold ${fontSize}px "Segoe UI", Arial, sans-serif`;
        ctx.fillStyle = "#fff";
        
        // Heavy text shadow for readability over bright colors
        ctx.shadowColor = "rgba(0,0,0,0.7)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Truncate if very long
        let displayName = item;
        if (displayName.length > 15) {
          displayName = displayName.substring(0, 13) + "..";
        }

        // Draw text at 85% of radius
        ctx.fillText(displayName, radius * 0.85, 0);
        ctx.restore();
      });

      ctx.restore();

      // Draw center circle outer border
      ctx.beginPath();
      ctx.arc(centerX, centerY, CENTER_RADIUS + 6, 0, 2 * Math.PI);
      ctx.fillStyle = "#f8fafc";
      ctx.fill();

      // Draw center circle (AMBC logo area)
      ctx.beginPath();
      ctx.arc(centerX, centerY, CENTER_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = "#fff"; 
      ctx.fill();
      ctx.strokeStyle = "#0284c7"; // Blue border
      ctx.lineWidth = 6;
      ctx.stroke();

      // Draw AMBC logo
      const logo = new Image();
      logo.src = "/ambc-logo.png";
      logo.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, CENTER_RADIUS - 2, 0, 2 * Math.PI);
        ctx.clip();
        
        const logoSize = CENTER_RADIUS * 1.6;
        ctx.drawImage(
          logo,
          centerX - logoSize / 2,
          centerY - logoSize / 2,
          logoSize,
          logoSize
        );
        ctx.restore();
      };
    };

    return (
      <div className="relative w-full max-w-[500px] md:max-w-[650px] aspect-square flex items-center justify-center mx-auto">
        {/* Outer Ring Glow/Shadow */}
        <div 
          className={`absolute inset-0 rounded-full transition-shadow duration-300 ${
            isSpinning ? 'shadow-[0_0_50px_rgba(14,165,233,0.8)]' : 'shadow-[0_15px_35px_rgba(0,0,0,0.3)]'
          }`} 
        />
        
        {/* Wheel Canvas */}
        {/* We use inline style for transform during active spin, but ref is used for idle rotation */}
        <canvas
          ref={canvasRef}
          width={WHEEL_SIZE}
          height={WHEEL_SIZE}
          onClick={onSpinClick}
          className="w-full h-full object-contain cursor-pointer rounded-full"
          style={isSpinning ? {
            transform: `rotate(${rotation}deg)`,
            transition: "transform 5.2s cubic-bezier(0.15, 0.8, 0.15, 1)", // Smooth ease-out
          } : undefined}
        />

        {/* "Tap to spin" Text overlay (static, doesn't spin) */}
        {!isSpinning && items.length > 0 && (
          <div 
            className="absolute text-3xl md:text-5xl font-black text-white tracking-wider cursor-pointer pointer-events-none animate-pulse"
            style={{
              top: '22%',
              textShadow: '0 4px 15px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.7)',
              WebkitTextStroke: '1px rgba(0,0,0,0.6)'
            }}
          >
            TAP TO SPIN
          </div>
        )}

        {/* Arrow Pointer (Right side pointing left) */}
        <div 
          className="absolute right-[-15px] md:right-[-25px] top-1/2 -translate-y-1/2 z-10"
          style={{ 
            width: 0, 
            height: 0,
            borderTop: "30px solid transparent",
            borderBottom: "30px solid transparent",
            borderRight: "50px solid #ef4444", // Red arrow
            filter: "drop-shadow(-4px 4px 6px rgba(0,0,0,0.5))"
          }}
        />
        
        {/* Inner dot detail on the arrow */}
        <div className="absolute right-[-2px] md:right-[-10px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full z-20 shadow-md" />
      </div>
    );
  }
);

LaneSpinWheel.displayName = "LaneSpinWheel";