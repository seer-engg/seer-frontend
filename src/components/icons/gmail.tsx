import { LucideProps } from 'lucide-react';

export const GmailSVG = ({ width = "100%", height = "100%" }: { width?: string | number; height?: string | number }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={width}
    height={height}
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Gmail</title>
    <path
      fill="currentColor"
      d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
    />
  </svg>
);

// Wrapper component compatible with LucideIcon interface
export const GmailIcon = ({ className, ...props }: LucideProps) => (
  <span className={className} {...props}>
    <GmailSVG width="1em" height="1em" />
  </span>
);

