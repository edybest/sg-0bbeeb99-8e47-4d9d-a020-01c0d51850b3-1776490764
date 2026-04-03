import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Player {
  id: string;
  username: string;
}

interface LaneSpinWheelProps {
  players: Player[];
  onSpinComplete: (winnerId: string) => void;
  isSpinning: boolean;
}

export function LaneSpinWheel({ players, onSpinComplete, isSpinning }: LaneSpinWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const { toast } = useToast();
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);

  const COLORS = ["#FF4444", "#4444FF", "#44CC44", "#FFBB33"];
  const WHEEL_SIZE = 600;
  const CENTER_RADIUS = 120;

  useEffect(() => {
    if (typeof window !== "undefined") {
      spinAudioRef.current = new Audio("/spin.mp3");
      winAudioRef.current = new Audio("/win.mp3");
    }
  }, []);

  useEffect(() => {
    drawWheel();
  }, [players, rotation]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas || players.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = WHEEL_SIZE / 2;
    const centerY = WHEEL_SIZE / 2;
    const radius = (WHEEL_SIZE - 40) / 2;
    const segmentAngle = (2 * Math.PI) / players.length;

    ctx.clearRect(0, 0, WHEEL_SIZE, WHEEL_SIZE);
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);

    // Draw segments
    players.forEach((player, index) => {
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

      // Draw border
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Calculate font size based on number of players
      const fontSize = players.length > 30 ? 16 : players.length > 20 ? 18 : 20;
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Truncate long names
      let displayName = player.username;
      if (displayName.length > 12) {
        displayName = displayName.substring(0, 10) + "..";
      }

      ctx.fillText(displayName, radius * 0.65, 0);
      ctx.restore();
    });

    ctx.restore();

    // Draw center circle (AMBC logo area)
    ctx.beginPath();
    ctx.arc(centerX, centerY, CENTER_RADIUS, 0, 2 * Math.PI);
    ctx.fillStyle = "#00BCD4";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 6;
    ctx.stroke();

    // Draw AMBC logo
    const logo = new Image();
    logo.src = "/ambc-logo.png";
    logo.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, CENTER_RADIUS - 10, 0, 2 * Math.PI);
      ctx.clip();
      ctx.drawImage(
        logo,
        centerX - CENTER_RADIUS + 10,
        centerY - CENTER_RADIUS + 10,
        (CENTER_RADIUS - 10) * 2,
        (CENTER_RADIUS - 10) * 2
      );
      ctx.restore();
    };

    // Draw "Tap to spin" text when not spinning
    if (!isSpinning) {
      ctx.font = "bold 28px Arial";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 8;
      ctx.fillText("Tap to spin", centerX, centerY + CENTER_RADIUS + 40);
    }
  };

  const spinWheel = () => {
    if (isSpinning || players.length === 0) return;

    // Play spin sound
    if (spinAudioRef.current) {
      spinAudioRef.current.currentTime = 0;
      spinAudioRef.current.play().catch(() => {});
    }

    const spins = 5 + Math.random() * 3; // 5-8 full rotations
    const extraDegrees = Math.random() * 360;
    const totalRotation = spins * 360 + extraDegrees;
    const duration = 4000; // 4 seconds
    const startTime = Date.now();
    const startRotation = rotation;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRotation = startRotation + totalRotation * easeOut;

      setRotation(currentRotation % 360);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Spin complete - determine winner
        const finalRotation = currentRotation % 360;
        const segmentAngle = 360 / players.length;
        // Arrow points to right (0 degrees), adjust for that
        const adjustedRotation = (360 - finalRotation + 90) % 360;
        const winnerIndex = Math.floor(adjustedRotation / segmentAngle) % players.length;
        const winner = players[winnerIndex];

        // Play win sound
        if (winAudioRef.current) {
          winAudioRef.current.currentTime = 0;
          winAudioRef.current.play().catch(() => {});
        }

        setTimeout(() => {
          onSpinComplete(winner.id);
          toast({
            title: "🎉 Pemenang!",
            description: `${winner.username} telah dipilih!`,
          });
        }, 500);
      }
    };

    animate();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        {/* Wheel Canvas */}
        <canvas
          ref={canvasRef}
          width={WHEEL_SIZE}
          height={WHEEL_SIZE}
          onClick={spinWheel}
          className="cursor-pointer drop-shadow-2xl transition-transform hover:scale-105"
          style={{ 
            maxWidth: "min(90vw, 600px)", 
            height: "auto",
            filter: isSpinning ? "none" : "drop-shadow(0 0 20px rgba(0,188,212,0.5))"
          }}
        />

        {/* Arrow Pointer */}
        <div 
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2"
          style={{ 
            width: 0, 
            height: 0,
            borderTop: "30px solid transparent",
            borderBottom: "30px solid transparent",
            borderLeft: "40px solid #FF4444",
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
          }}
        />
      </div>

      {/* Info */}
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-sky-700">
          {players.length} Peserta
        </p>
        {isSpinning && (
          <p className="text-sm text-muted-foreground animate-pulse">
            🎰 Memutar wheel...
          </p>
        )}
      </div>
    </div>
  );
}