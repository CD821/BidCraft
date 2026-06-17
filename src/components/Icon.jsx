const paths = {
  projects: "M3 7h6l2 2h10v10H3z M3 7V5h7l2 2",
  book: "M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22z M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22z",
  company: "M4 22V4l8-2 8 2v18 M9 22v-4h6v4 M8 7h1 M8 11h1 M15 7h1 M15 11h1",
  cloud: "M17.5 19H7a5 5 0 1 1 1.1-9.9A7 7 0 0 1 21 12.5 3.5 3.5 0 0 1 17.5 19z",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-2 .1l-.6.4a1.7 1.7 0 0 0-.9 1.6V22h-4v-.3a1.7 1.7 0 0 0-.9-1.6l-.6-.4a1.7 1.7 0 0 0-2-.1l-.2.1-2-3.4.1-.1a1.7 1.7 0 0 0 .3-1.9l-.3-.7a1.7 1.7 0 0 0-1.4-1.1H3v-4h.2a1.7 1.7 0 0 0 1.4-1.1l.3-.7a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 2-.1l.6-.4a1.7 1.7 0 0 0 .9-1.6V2h4v.3a1.7 1.7 0 0 0 .9 1.6l.6.4a1.7 1.7 0 0 0 2 .1l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9l.3.7a1.7 1.7 0 0 0 1.4 1.1h.2v4h-.2a1.7 1.7 0 0 0-1.4 1.1z",
  plus: "M12 5v14 M5 12h14",
  save: "M5 3h12l3 3v15H4V3z M8 3v6h8V3 M8 21v-7h8v7",
  print: "M6 9V3h12v6 M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2 M6 14h12v8H6z",
  estimate: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
  materials: "M21 16V8l-9-5-9 5v8l9 5z M3.3 7.7 12 13l8.7-5.3 M12 22v-9",
  proposal: "M6 2h9l5 5v15H6z M14 2v6h6 M9 13h8 M9 17h8",
  trash: "M4 7h16 M9 7V4h6v3 M7 7l1 14h8l1-14",
  copy: "M8 8h12v12H8z M4 16H3V4h12v1",
  search: "m21 21-4.35-4.35 M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0z",
  download: "M12 3v12 M7 10l5 5 5-5 M4 21h16",
  upload: "M12 21V9 M7 14l5-5 5 5 M4 3h16",
  menu: "M4 7h16 M4 12h16 M4 17h16",
  x: "M6 6l12 12 M18 6 6 18",
  check: "m5 12 4 4L19 6",
  edit: "M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z",
};

export function Icon({ name, size = 20, className = "" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <path
        d={paths[name] || paths.estimate}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
