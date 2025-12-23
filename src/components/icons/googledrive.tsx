import { LucideProps } from 'lucide-react';

export const GoogleDriveSVG = ({ width = "100%", height = "100%" }: { width?: string | number; height?: string | number }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={width}
    height={height}
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Google Drive</title>
    <path
      fill="#0066DA"
      d="M7.71 19.5L1.15 8.5l2.85-5h6.56l6.56 11z"
    />
    <path
      fill="#00AC47"
      d="M14.85 8.5h6.56l-6.56 11H8.29l6.56-11z"
    />
    <path
      fill="#EA4335"
      d="M10.56 3.5L7.71 8.5l7.14 11h2.85L13.41 3.5h-2.85z"
    />
  </svg>
);

// Wrapper component compatible with LucideIcon interface
export const GoogleDriveIcon = ({ className, ...props }: LucideProps) => (
  <span className={className} {...props}>
    <GoogleDriveSVG width="1em" height="1em" />
  </span>
);

