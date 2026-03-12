import { BowlingBallLoader } from "@/components/BowlingBallLoader";
import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";

export function GlobalLoadingOverlay() {
  const { isLoading } = useGlobalLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/70 backdrop-blur-sm">
      <div className="h-full w-full flex items-center justify-center">
        <BowlingBallLoader />
      </div>
    </div>
  );
}