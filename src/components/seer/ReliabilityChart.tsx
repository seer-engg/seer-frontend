import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ReliabilityChartProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ReliabilityChart({ score, size = 'md', showLabel = true }: ReliabilityChartProps) {
  const dimensions = {
    sm: { size: 80, stroke: 6 },
    md: { size: 120, stroke: 8 },
    lg: { size: 180, stroke: 12 },
  };

  const { size: chartSize, stroke } = dimensions[size];
  const radius = (chartSize - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 80) return "text-success";
    if (score >= 50) return "text-warning";
    return "text-bug";
  };

  const getStrokeColor = () => {
    if (score >= 80) return "stroke-success";
    if (score >= 50) return "stroke-warning";
    return "stroke-bug";
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={chartSize}
        height={chartSize}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={chartSize / 2}
          cy={chartSize / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-secondary"
        />
        {/* Progress circle */}
        <motion.circle
          cx={chartSize / 2}
          cy={chartSize / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={getStrokeColor()}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className={cn(
              "font-bold",
              size === 'lg' ? "text-3xl" : size === 'md' ? "text-2xl" : "text-lg",
              getColor()
            )}
          >
            {score}%
          </motion.span>
          {size !== 'sm' && (
            <span className="text-xs text-muted-foreground">Reliability</span>
          )}
        </div>
      )}
    </div>
  );
}
