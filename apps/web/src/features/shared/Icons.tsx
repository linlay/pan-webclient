import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export function IconFolder(props: IconProps) {
  return <IconBase {...props}><path d="M3 6.75A1.75 1.75 0 0 1 4.75 5h3.07c.46 0 .9.18 1.23.5l.95.93c.19.19.45.3.72.3h4.53A1.75 1.75 0 0 1 17 8.48v5.77A1.75 1.75 0 0 1 15.25 16H4.75A1.75 1.75 0 0 1 3 14.25z" /></IconBase>;
}

export function IconFile(props: IconProps) {
  return <IconBase {...props}><path d="M6.25 3h4.5l3 3v7.75A1.25 1.25 0 0 1 12.5 15h-6A1.25 1.25 0 0 1 5.25 13.75v-9.5A1.25 1.25 0 0 1 6.5 3z" /><path d="M10.75 3v2.5a.75.75 0 0 0 .75.75H14" /></IconBase>;
}

export function IconImage(props: IconProps) {
  return <IconBase {...props}><rect x="3.5" y="4.5" width="13" height="11" rx="2" /><path d="m6.75 12.25 2.1-2.3a.75.75 0 0 1 1.1 0l1.3 1.4 1.15-1.2a.75.75 0 0 1 1.1.01l1.75 2.09" /><circle cx="8.25" cy="8.25" r="1" /></IconBase>;
}

export function IconVideo(props: IconProps) {
  return <IconBase {...props}><rect x="3.5" y="4.5" width="9.5" height="11" rx="2" /><path d="m13 8.25 2.75-1.75v7l-2.75-1.75" /></IconBase>;
}

export function IconAudio(props: IconProps) {
  return <IconBase {...props}><path d="M11.5 4.5v7.75a2.25 2.25 0 1 1-1.5-2.12V6.75l5-1.25v5.25a2.25 2.25 0 1 1-1.5-2.12V4.88z" /></IconBase>;
}

export function IconCode(props: IconProps) {
  return <IconBase {...props}><path d="m8 6.5-3 3 3 3" /><path d="m12 6.5 3 3-3 3" /></IconBase>;
}

export function IconSearch(props: IconProps) {
  return <IconBase {...props}><circle cx="8.25" cy="8.25" r="3.75" /><path d="m11.25 11.25 3.25 3.25" /></IconBase>;
}

export function IconUpload(props: IconProps) {
  return <IconBase {...props}><path d="M10 14.5v-7" /><path d="m7.25 10.25 2.75-2.75 2.75 2.75" /><path d="M4.5 14.5h11" /></IconBase>;
}

export function IconPlus(props: IconProps) {
  return <IconBase {...props}><path d="M10 5v10" /><path d="M5 10h10" /></IconBase>;
}

export function IconMore(props: IconProps) {
  return <IconBase {...props}><circle cx="5.5" cy="10" r="1" /><circle cx="10" cy="10" r="1" /><circle cx="14.5" cy="10" r="1" /></IconBase>;
}

export function IconTrash(props: IconProps) {
  return <IconBase {...props}><path d="M5.5 6.5h9" /><path d="M7 6.5V5.25A1.25 1.25 0 0 1 8.25 4h3.5A1.25 1.25 0 0 1 13 5.25V6.5" /><path d="m6.5 6.5.6 7.02A1.5 1.5 0 0 0 8.6 15h2.8a1.5 1.5 0 0 0 1.5-1.48l.6-7.02" /><path d="M8.75 8.75v3.5" /><path d="M11.25 8.75v3.5" /></IconBase>;
}

export function IconMoon(props: IconProps) {
  return <IconBase {...props}><path d="M13.75 12.75A5.5 5.5 0 0 1 7.25 6a5.75 5.75 0 1 0 6.5 6.75" /></IconBase>;
}

export function IconSun(props: IconProps) {
  return <IconBase {...props}><circle cx="10" cy="10" r="2.75" /><path d="M10 3.75v1.5" /><path d="M10 14.75v1.5" /><path d="m5.58 5.58 1.06 1.06" /><path d="m13.36 13.36 1.06 1.06" /><path d="M3.75 10h1.5" /><path d="M14.75 10h1.5" /><path d="m5.58 14.42 1.06-1.06" /><path d="m13.36 6.64 1.06-1.06" /></IconBase>;
}

export function IconDesktop(props: IconProps) {
  return <IconBase {...props}><rect x="3.75" y="4.5" width="12.5" height="8.5" rx="1.75" /><path d="M8 15.5h4" /><path d="M10 13v2.5" /></IconBase>;
}

export function IconLogout(props: IconProps) {
  return <IconBase {...props}><path d="M7.5 5H6a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 6 15h1.5" /><path d="M11.25 7.25 14 10l-2.75 2.75" /><path d="M8 10h6" /></IconBase>;
}

export function IconArrowLeft(props: IconProps) {
  return <IconBase {...props}><path d="m8 6-4 4 4 4" /><path d="M4 10h12" /></IconBase>;
}

export function IconRefresh(props: IconProps) {
  return <IconBase {...props}><path d="M14.5 8.5A4.75 4.75 0 0 0 6.1 7" /><path d="M14.5 5.75V8.5h-2.75" /><path d="M5.5 11.5A4.75 4.75 0 0 0 13.9 13" /><path d="M5.5 14.25V11.5h2.75" /></IconBase>;
}

export function IconMove(props: IconProps) {
  return <IconBase {...props}><path d="M10 4.5v11" /><path d="m7 7.5 3-3 3 3" /><path d="m7 12.5 3 3 3-3" /></IconBase>;
}

export function IconCopy(props: IconProps) {
  return <IconBase {...props}><rect x="6" y="6" width="8" height="8" rx="1.5" /><path d="M4.5 12V5.5A1.5 1.5 0 0 1 6 4h6.5" /></IconBase>;
}

export function IconDownload(props: IconProps) {
  return <IconBase {...props}><path d="M10 5.5v7" /><path d="m7.25 10 2.75 2.75L12.75 10" /><path d="M4.5 14.5h11" /></IconBase>;
}

export function IconEdit(props: IconProps) {
  return <IconBase {...props}><path d="m5.25 13.75 2.2-.46 5.17-5.17a1.25 1.25 0 0 0 0-1.77l-.97-.98a1.25 1.25 0 0 0-1.77 0L4.71 10.54l-.46 2.21Z" /><path d="m9 6.25 2.75 2.75" /></IconBase>;
}

export function IconCheck(props: IconProps) {
  return <IconBase {...props}><path d="m5 10 3 3 7-7" /></IconBase>;
}

function IconBase({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 20 20"
      width={size}
      {...props}
    >
      {children}
    </svg>
  );
}
