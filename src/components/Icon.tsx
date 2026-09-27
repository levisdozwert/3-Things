import type { ReactElement, SVGProps } from "react";

export type IconName =
  | "mic"
  | "stop"
  | "play"
  | "pause"
  | "search"
  | "close"
  | "back"
  | "keyboard"
  | "check"
  | "up"
  | "down"
  | "plus"
  | "minus"
  | "trash"
  | "pencil"
  | "home"
  | "library"
  | "you"
  | "heart"
  | "download"
  | "share"
  | "bookmark"
  | "bookmarked"
  | "forward";

const paths: Record<IconName, ReactElement> = {
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11.5" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3" />
    </>
  ),
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor" stroke="none" />,
  play: <path d="M8 5.8v12.4a.8.8 0 0 0 1.2.7l9.9-6.2a.8.8 0 0 0 0-1.4L9.2 5.1a.8.8 0 0 0-1.2.7Z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="7" y="5.5" width="3.5" height="13" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="13.5" y="5.5" width="3.5" height="13" rx="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  back: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  keyboard: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <path d="M7 10h.01M10.5 10h.01M14 10h.01M17.5 10h.01M8 14h8" />
    </>
  ),
  check: <path d="m5.5 12.5 4 4 9-9.5" />,
  up: <path d="m6.5 14.5 5.5-5.5 5.5 5.5" />,
  down: <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  minus: <path d="M5.5 12h13" />,
  trash: (
    <>
      <path d="M4.5 7h15M10 4.5h4M6.5 7l.9 11.2a1.5 1.5 0 0 0 1.5 1.3h6.2a1.5 1.5 0 0 0 1.5-1.3L17.5 7" />
    </>
  ),
  pencil: <path d="M14.5 5.5l4 4L9 19H5v-4l9.5-9.5Z" />,
  // Home is where you ask: three marks, like a voice becoming three things.
  home: (
    <>
      <path d="M7 10v6" />
      <path d="M12 6.5v11" />
      <path d="M17 9v7" />
    </>
  ),
  library: (
    <>
      <path d="M4.5 6.5h15" />
      <path d="M4.5 12h11" />
      <path d="M4.5 17.5h7" />
    </>
  ),
  you: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19.5c1.2-3.3 3.8-5 7-5s5.8 1.7 7 5" />
    </>
  ),
  download: (
    <>
      <path d="M12 4.5v10M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  share: (
    <>
      <path d="M12 3.5v11M8 7.5l4-4 4 4" />
      <path d="M6.5 11H6a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 18 11h-.5" />
    </>
  ),
  bookmark: <path d="M7 4.5h10a1 1 0 0 1 1 1v14l-6-4-6 4v-14a1 1 0 0 1 1-1Z" />,
  bookmarked: <path d="M7 4.5h10a1 1 0 0 1 1 1v14l-6-4-6 4v-14a1 1 0 0 1 1-1Z" fill="currentColor" />,
  forward: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  heart: <path d="M12 19s-7-4.4-7-9.6A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 2.4C19 14.6 12 19 12 19Z" />,
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, strokeWidth = 1.7, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
