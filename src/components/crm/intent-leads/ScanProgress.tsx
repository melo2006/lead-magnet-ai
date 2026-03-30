import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StopCircle, Radar } from "lucide-react";

interface ScanProgressProps {
  isScanning: boolean;
  onStop: () => void;
  statusMessage?: string;
}

export default function ScanProgress({ isScanning, onStop, statusMessage }: ScanProgressProps) {
  if (!isScanning) return null;

  return (
    <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
      <Radar className="w-5 h-5 text-primary animate-spin shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{statusMessage || "Scanning public sources..."}</p>
        <Progress className="mt-1.5 h-2" />
      </div>
      <Button variant="destructive" size="sm" onClick={onStop}>
        <StopCircle className="w-4 h-4 mr-1" />
        Stop
      </Button>
    </div>
  );
}
