import { useId } from "react";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  const gradientId = useId();

  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label="夜班巡检"
      className={className}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="50"
          y1="18"
          x2="82"
          y2="82"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#34E99C" />
          <stop offset="0.5" stopColor="#02CEC5" />
          <stop offset="1" stopColor="#079CF4" />
        </linearGradient>
      </defs>

      <path
        d="M21 24 75 81"
        fill="none"
        stroke="#102448"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="m28 68-12 13h12l8-9"
        fill="none"
        stroke="#102448"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m57 43 23-24"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M86 40a6 6 0 0 1 6 6v17c0 9-3 17-10 23L72 74c5-2 8-6 8-12V48c0-3 2-6 6-8Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}
