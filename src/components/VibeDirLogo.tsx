export default function VibeDirLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="vibe-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(142 72% 46%)" />
          <stop offset="55%" stopColor="hsl(271 81% 56%)" />
          <stop offset="100%" stopColor="hsl(330 81% 60%)" />
        </linearGradient>
        <filter id="vibe-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="32" height="32" rx="8" fill="hsl(160 15% 7%)" />
      <path
        d="M9 9L16 23L23 9"
        stroke="url(#vibe-grad)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#vibe-glow)"
      />
      <circle cx="16" cy="23" r="2" fill="url(#vibe-grad)" opacity="0.8" />
    </svg>
  );
}
