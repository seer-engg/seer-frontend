import { LucideProps } from 'lucide-react';

export const GoogleSheetsSVG = ({ width = "100%", height = "100%" }: { width?: string | number; height?: string | number }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={width}
    height={height}
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Google Sheets</title>
    <path
      fill="#0F9D58"
      d="M19.566 2.434A2.307 2.307 0 0 1 21.307 2H24v20h-2.693a2.307 2.307 0 0 1-2.307-2.307V2.434z"
    />
    <path
      fill="#87CEAC"
      d="M19.566 2.434v17.259a2.307 2.307 0 0 1-2.307 2.307H5.307A2.307 2.307 0 0 1 3 19.693V4.307A2.307 2.307 0 0 1 5.307 2h13.259a2.307 2.307 0 0 1 1 2.434z"
    />
    <path
      fill="#F1F1F1"
      d="M5.307 2C4.033 2 3 3.033 3 4.307v15.386C3 20.967 4.033 22 5.307 22h11.952c1.274 0 2.307-1.033 2.307-2.307V4.307C19.566 3.033 18.533 2 17.259 2H5.307z"
    />
    <path
      fill="#0F9D58"
      d="M7.5 6h9v1.5h-9V6zm0 3h9v1.5h-9V9zm0 3h9v1.5h-9V12zm0 3h6v1.5h-6V15z"
    />
  </svg>
);

// Wrapper component compatible with LucideIcon interface
export const GoogleSheetsIcon = ({ className, ...props }: LucideProps) => (
  <span className={className} {...props}>
    <GoogleSheetsSVG width="1em" height="1em" />
  </span>
);

