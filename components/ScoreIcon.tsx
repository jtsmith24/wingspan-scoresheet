import React from "react";

export type ScoreIconName =
  | "bird"
  | "bonus"
  | "goal"
  | "egg"
  | "food"
  | "tucked"
  | "duet"
  | "hummingbird"
  | "forest"
  | "grassland"
  | "wetland";

const paths: Record<ScoreIconName, React.ReactNode> = {
  bird: (
    <>
      <path d="M4 15c3 0 5-1.5 6.5-4C12 8.5 14 7 17 7.5l3 1-2.5 1.5c0 4-3 7.5-8 7.5H4z" />
      <path d="M9 13l3-4" />
      <circle cx="16.5" cy="9" r=".6" fill="currentColor" />
    </>
  ),
  bonus: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M12 8l1.2 2.5 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4z" />
    </>
  ),
  goal: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 12.5l2.7 2.7L16 9.5" />
    </>
  ),
  egg: <path d="M12 3c3.5 0 6.5 5.5 6.5 10a6.5 6.5 0 01-13 0C5.5 8.5 8.5 3 12 3z" />,
  food: (
    <>
      <path d="M12 21V9" />
      <path d="M12 13c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4zM12 13c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4z" />
      <path d="M12 9c-1.5-1-2-2.5-1.5-5 1.5 1 2 2.5 1.5 5zM12 17c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4zM12 17c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4z" />
    </>
  ),
  tucked: (
    <>
      <rect x="8" y="3" width="11" height="15" rx="1.5" />
      <path d="M8 6.5H6.5A1.5 1.5 0 005 8v11.5A1.5 1.5 0 006.5 21H14a1.5 1.5 0 001.5-1.5V18" />
    </>
  ),
  duet: (
    <>
      <path d="M12 3l7.5 4.3v8.6L12 20.2l-7.5-4.3V7.3z" />
      <circle cx="12" cy="11.6" r="2.6" />
    </>
  ),
  hummingbird: (
    <>
      <path d="M2.5 6.5l6 2.5" />
      <path d="M8.5 9c1.5-1.5 3.5-1.5 4.5 0 1 2 .5 4-1 5.5L9 17.5l-1-3" />
      <path d="M12 10.5c2-3 4.5-5.5 8-6.5-1 3.5-3.5 6-7 7.5" />
      <circle cx="10" cy="10" r=".5" fill="currentColor" />
    </>
  ),
  forest: (
    <>
      <path d="M12 3l6 9h-3.5l4 6h-13l4-6H6z" />
      <path d="M12 18v3" />
    </>
  ),
  grassland: (
    <>
      <path d="M3 20h18" />
      <path d="M6 20c0-4 1-7 3-10M10 20c0-5 .5-9 2-13M14 20c0-4 .5-7 3-10M18 20c0-2 .5-4 2-6" />
    </>
  ),
  wetland: (
    <>
      <path d="M3 9c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
      <path d="M3 14c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
      <path d="M3 19c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
    </>
  ),
};

export const ScoreIcon = ({ name }: { name: ScoreIconName }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="score-icon"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {paths[name]}
  </svg>
);
