import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="32" height="32" rx="8" fill="#1a1a1a" />
        <rect x="7" y="12" width="2.5" height="8" rx="1.25" fill="white" />
        <rect x="11" y="9" width="2.5" height="14" rx="1.25" fill="white" />
        <rect x="15" y="6" width="2.5" height="20" rx="1.25" fill="white" />
        <rect x="19" y="9" width="2.5" height="14" rx="1.25" fill="white" />
        <rect x="23" y="12" width="2.5" height="8" rx="1.25" fill="white" />
      </svg>
    ),
    { ...size }
  );
}
