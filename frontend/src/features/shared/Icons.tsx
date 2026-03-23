import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
	size?: number;
};

type MaterialIconProps = {
	name: string;
	className?: string;
	filled?: boolean;
	size?: string;
};

export function MaterialIcon(props: MaterialIconProps) {
	const className =
		`inline-block align-middle shrink-0 ${props.size ?? ""} ${props.className ?? ""}`.trim();
	const common = { className, "aria-hidden": true } as const;

	switch (props.name) {
		case "add":
			return <IconPlus {...common} />;
		case "arrow_back":
		case "chevron_left":
			return <IconArrowLeft {...common} />;
		case "article":
		case "description":
		case "draft":
		case "folder_open":
		case "picture_as_pdf":
			return <IconFile {...common} />;
		case "backup":
			return <IconCloudUpload {...common} />;
		case "check_circle":
			return <IconCheckCircle {...common} />;
		case "chevron_right":
			return <IconChevronRight {...common} />;
		case "close":
			return <IconClose {...common} />;
		case "cloud":
			return <IconCloud {...common} />;
		case "cloud_done":
			return <IconCloudDone {...common} />;
		case "computer":
			return <IconDesktop {...common} />;
		case "content_copy":
			return <IconCopy {...common} />;
		case "create_new_folder":
			return <IconFolderPlus {...common} />;
		case "dark_mode":
			return <IconMoon {...common} />;
		case "delete":
		case "delete_forever":
		case "delete_sweep":
			return <IconTrash {...common} />;
		case "download":
			return <IconDownload {...common} />;
		case "drive_file_move":
			return <IconMove {...common} />;
		case "edit":
			return <IconEdit {...common} />;
		case "error":
			return <IconAlertCircle {...common} />;
		case "expand_more":
			return <IconChevronDown {...common} />;
		case "folder":
			return <IconFolder {...common} />;
		case "grid_view":
			return <IconGrid {...common} />;
		case "hard_drive":
			return <IconDrive {...common} />;
		case "image":
			return <IconImage {...common} />;
		case "light_mode":
			return <IconSun {...common} />;
		case "lock":
			return <IconLock {...common} />;
		case "login":
			return <IconLogin {...common} />;
		case "logout":
			return <IconLogout {...common} />;
		case "mail":
			return <IconMail {...common} />;
		case "menu":
			return <IconMenu {...common} />;
		case "more_vert":
			return <IconMore {...common} />;
		case "movie":
			return <IconVideo {...common} />;
		case "music_note":
			return <IconAudio {...common} />;
		case "open_in_new":
			return <IconOpenInNew {...common} />;
		case "person":
			return <IconUser {...common} />;
		case "refresh":
			return <IconRefresh {...common} />;
		case "restore":
			return <IconRestore {...common} />;
		case "schedule":
			return <IconClock {...common} />;
		case "search":
			return <IconSearch {...common} />;
		case "star":
			return <IconStar {...common} />;
		case "sync":
			return <IconSync {...common} />;
		case "touch_app":
			return <IconTap {...common} />;
		case "translate":
			return <IconTranslate {...common} />;
		case "upload":
			return <IconUpload {...common} />;
		case "view_list":
			return <IconList {...common} />;
		case "visibility":
			return <IconEye {...common} />;
		case "visibility_off":
			return <IconEyeOff {...common} />;
		case "zoom_in":
			return <IconSearchPlus {...common} />;
		default:
			return <IconFile {...common} />;
	}
}

// ─── SVG Icon Components (kept for offline / fallback use) ───
export function IconFolder(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M3 6.75A1.75 1.75 0 0 1 4.75 5h3.07c.46 0 .9.18 1.23.5l.95.93c.19.19.45.3.72.3h4.53A1.75 1.75 0 0 1 17 8.48v5.77A1.75 1.75 0 0 1 15.25 16H4.75A1.75 1.75 0 0 1 3 14.25z" />
		</IconBase>
	);
}

export function IconFile(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M6.25 3h4.5l3 3v7.75A1.25 1.25 0 0 1 12.5 15h-6A1.25 1.25 0 0 1 5.25 13.75v-9.5A1.25 1.25 0 0 1 6.5 3z" />
			<path d="M10.75 3v2.5a.75.75 0 0 0 .75.75H14" />
		</IconBase>
	);
}

export function IconImage(props: IconProps) {
	return (
		<IconBase {...props}>
			<rect x="3.5" y="4.5" width="13" height="11" rx="2" />
			<path d="m6.75 12.25 2.1-2.3a.75.75 0 0 1 1.1 0l1.3 1.4 1.15-1.2a.75.75 0 0 1 1.1.01l1.75 2.09" />
			<circle cx="8.25" cy="8.25" r="1" />
		</IconBase>
	);
}

export function IconVideo(props: IconProps) {
	return (
		<IconBase {...props}>
			<rect x="3.5" y="4.5" width="9.5" height="11" rx="2" />
			<path d="m13 8.25 2.75-1.75v7l-2.75-1.75" />
		</IconBase>
	);
}

export function IconAudio(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M11.5 4.5v7.75a2.25 2.25 0 1 1-1.5-2.12V6.75l5-1.25v5.25a2.25 2.25 0 1 1-1.5-2.12V4.88z" />
		</IconBase>
	);
}

export function IconCode(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="m8 6.5-3 3 3 3" />
			<path d="m12 6.5 3 3-3 3" />
		</IconBase>
	);
}

export function IconTranslate(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M3.75 5h7.5" />
			<path d="M7.5 3.75V5" />
			<path d="M5.35 7.5c.65 1.95 1.84 3.73 3.57 5.1" />
			<path d="M9.65 7.5c-.65 1.95-1.84 3.73-3.57 5.1" />
			<path d="m12.6 15.25 2.05-5.9 2.05 5.9" />
			<path d="M13.45 13.2h2.4" />
		</IconBase>
	);
}

export function IconSearch(props: IconProps) {
	return (
		<IconBase {...props}>
			<circle cx="8.25" cy="8.25" r="3.75" />
			<path d="m11.25 11.25 3.25 3.25" />
		</IconBase>
	);
}

export function IconUpload(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M10 14.5v-7" />
			<path d="m7.25 10.25 2.75-2.75 2.75 2.75" />
			<path d="M4.5 14.5h11" />
		</IconBase>
	);
}

export function IconPlus(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M10 5v10" />
			<path d="M5 10h10" />
		</IconBase>
	);
}

export function IconMore(props: IconProps) {
	return (
		<IconBase {...props}>
			<circle cx="5.5" cy="10" r="1" />
			<circle cx="10" cy="10" r="1" />
			<circle cx="14.5" cy="10" r="1" />
		</IconBase>
	);
}

export function IconTrash(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M5.5 6.5h9" />
			<path d="M7 6.5V5.25A1.25 1.25 0 0 1 8.25 4h3.5A1.25 1.25 0 0 1 13 5.25V6.5" />
			<path d="m6.5 6.5.6 7.02A1.5 1.5 0 0 0 8.6 15h2.8a1.5 1.5 0 0 0 1.5-1.48l.6-7.02" />
			<path d="M8.75 8.75v3.5" />
			<path d="M11.25 8.75v3.5" />
		</IconBase>
	);
}

export function IconMoon(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M13.75 12.75A5.5 5.5 0 0 1 7.25 6a5.75 5.75 0 1 0 6.5 6.75" />
		</IconBase>
	);
}

export function IconSun(props: IconProps) {
	return (
		<IconBase {...props}>
			<circle cx="10" cy="10" r="2.75" />
			<path d="M10 3.75v1.5" />
			<path d="M10 14.75v1.5" />
			<path d="m5.58 5.58 1.06 1.06" />
			<path d="m13.36 13.36 1.06 1.06" />
			<path d="M3.75 10h1.5" />
			<path d="M14.75 10h1.5" />
			<path d="m5.58 14.42 1.06-1.06" />
			<path d="m13.36 6.64 1.06-1.06" />
		</IconBase>
	);
}

export function IconDesktop(props: IconProps) {
	return (
		<IconBase {...props}>
			<rect x="3.75" y="4.5" width="12.5" height="8.5" rx="1.75" />
			<path d="M8 15.5h4" />
			<path d="M10 13v2.5" />
		</IconBase>
	);
}

export function IconLogout(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M7.5 5H6a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 6 15h1.5" />
			<path d="M11.25 7.25 14 10l-2.75 2.75" />
			<path d="M8 10h6" />
		</IconBase>
	);
}

export function IconArrowLeft(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="m8 6-4 4 4 4" />
			<path d="M4 10h12" />
		</IconBase>
	);
}

export function IconRefresh(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M14.5 8.5A4.75 4.75 0 0 0 6.1 7" />
			<path d="M14.5 5.75V8.5h-2.75" />
			<path d="M5.5 11.5A4.75 4.75 0 0 0 13.9 13" />
			<path d="M5.5 14.25V11.5h2.75" />
		</IconBase>
	);
}

export function IconMove(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M10 4.5v11" />
			<path d="m7 7.5 3-3 3 3" />
			<path d="m7 12.5 3 3 3-3" />
		</IconBase>
	);
}

export function IconCopy(props: IconProps) {
	return (
		<IconBase {...props}>
			<rect x="6" y="6" width="8" height="8" rx="1.5" />
			<path d="M4.5 12V5.5A1.5 1.5 0 0 1 6 4h6.5" />
		</IconBase>
	);
}

export function IconDownload(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M10 5.5v7" />
			<path d="m7.25 10 2.75 2.75L12.75 10" />
			<path d="M4.5 14.5h11" />
		</IconBase>
	);
}

export function IconEdit(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="m5.25 13.75 2.2-.46 5.17-5.17a1.25 1.25 0 0 0 0-1.77l-.97-.98a1.25 1.25 0 0 0-1.77 0L4.71 10.54l-.46 2.21Z" />
			<path d="m9 6.25 2.75 2.75" />
		</IconBase>
	);
}

export function IconCheck(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="m5 10 3 3 7-7" />
		</IconBase>
	);
}

export function IconChevronRight(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="m8 5.5 4 4.5-4 4.5" />
		</IconBase>
	);
}

export function IconChevronDown(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="m5.5 8 4.5 4 4.5-4" />
		</IconBase>
	);
}

export function IconClose(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="m6 6 8 8" />
			<path d="m14 6-8 8" />
		</IconBase>
	);
}

export function IconMenu(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M4.5 6.5h11" />
			<path d="M4.5 10h11" />
			<path d="M4.5 13.5h11" />
		</IconBase>
	);
}

export function IconGrid(props: IconProps) {
	return (
		<IconBase {...props}>
			<rect x="4.5" y="4.5" width="4.25" height="4.25" rx="0.75" />
			<rect x="11.25" y="4.5" width="4.25" height="4.25" rx="0.75" />
			<rect x="4.5" y="11.25" width="4.25" height="4.25" rx="0.75" />
			<rect x="11.25" y="11.25" width="4.25" height="4.25" rx="0.75" />
		</IconBase>
	);
}

export function IconList(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M7.25 6.5h8" />
			<path d="M7.25 10h8" />
			<path d="M7.25 13.5h8" />
			<circle
				cx="4.75"
				cy="6.5"
				r="0.75"
				fill="currentColor"
				stroke="none"
			/>
			<circle
				cx="4.75"
				cy="10"
				r="0.75"
				fill="currentColor"
				stroke="none"
			/>
			<circle
				cx="4.75"
				cy="13.5"
				r="0.75"
				fill="currentColor"
				stroke="none"
			/>
		</IconBase>
	);
}

export function IconClock(props: IconProps) {
	return (
		<IconBase {...props}>
			<circle cx="10" cy="10" r="5.5" />
			<path d="M10 7v3.5l2.25 1.5" />
		</IconBase>
	);
}

export function IconSync(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M14.5 8A4.5 4.5 0 0 0 7 5.75" />
			<path d="M14.5 5.5V8H12" />
			<path d="M5.5 12A4.5 4.5 0 0 0 13 14.25" />
			<path d="M5.5 14.5V12H8" />
		</IconBase>
	);
}

export function IconCloud(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M6.25 15h7.1a2.65 2.65 0 0 0 .45-5.26A4.5 4.5 0 0 0 5.2 8.8 2.9 2.9 0 0 0 6.25 15Z" />
		</IconBase>
	);
}

export function IconCloudDone(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M6.25 15h7.1a2.65 2.65 0 0 0 .45-5.26A4.5 4.5 0 0 0 5.2 8.8 2.9 2.9 0 0 0 6.25 15Z" />
			<path d="m8.2 10.2 1.2 1.2 2.4-2.6" />
		</IconBase>
	);
}

export function IconCloudUpload(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M6.25 15h7.1a2.65 2.65 0 0 0 .45-5.26A4.5 4.5 0 0 0 5.2 8.8 2.9 2.9 0 0 0 6.25 15Z" />
			<path d="M10 12.25V8.5" />
			<path d="m8.4 10.1 1.6-1.6 1.6 1.6" />
		</IconBase>
	);
}

export function IconMail(props: IconProps) {
	return (
		<IconBase {...props}>
			<rect x="4" y="5.5" width="12" height="9" rx="1.5" />
			<path d="m5 7 5 4 5-4" />
		</IconBase>
	);
}

export function IconLock(props: IconProps) {
	return (
		<IconBase {...props}>
			<rect x="5.5" y="9" width="9" height="6.5" rx="1.5" />
			<path d="M7.5 9V7.5A2.5 2.5 0 0 1 10 5a2.5 2.5 0 0 1 2.5 2.5V9" />
		</IconBase>
	);
}

export function IconEye(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M3.75 10s2.25-4 6.25-4 6.25 4 6.25 4-2.25 4-6.25 4-6.25-4-6.25-4Z" />
			<circle cx="10" cy="10" r="1.75" />
		</IconBase>
	);
}

export function IconEyeOff(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M3.75 10s2.25-4 6.25-4c1.1 0 2.08.2 2.94.54" />
			<path d="M16.25 10s-2.25 4-6.25 4c-1.1 0-2.08-.2-2.94-.54" />
			<path d="m5 5 10 10" />
		</IconBase>
	);
}

export function IconLogin(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M12.5 5H14a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 14 15h-1.5" />
			<path d="M8.75 7.25 6 10l2.75 2.75" />
			<path d="M6 10h8" />
		</IconBase>
	);
}

export function IconDrive(props: IconProps) {
	return (
		<IconBase {...props}>
			<rect x="4.5" y="5" width="11" height="4" rx="1" />
			<rect x="4.5" y="11" width="11" height="4" rx="1" />
			<circle
				cx="13.25"
				cy="7"
				r="0.6"
				fill="currentColor"
				stroke="none"
			/>
			<circle
				cx="13.25"
				cy="13"
				r="0.6"
				fill="currentColor"
				stroke="none"
			/>
		</IconBase>
	);
}

export function IconFolderPlus(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M3 6.75A1.75 1.75 0 0 1 4.75 5h3.07c.46 0 .9.18 1.23.5l.95.93c.19.19.45.3.72.3h4.53A1.75 1.75 0 0 1 17 8.48v5.77A1.75 1.75 0 0 1 15.25 16H4.75A1.75 1.75 0 0 1 3 14.25z" />
			<path d="M10 9v4" />
			<path d="M8 11h4" />
		</IconBase>
	);
}

export function IconSearchPlus(props: IconProps) {
	return (
		<IconBase {...props}>
			<circle cx="8.25" cy="8.25" r="3.75" />
			<path d="m11.25 11.25 3.25 3.25" />
			<path d="M8.25 6.8v2.9" />
			<path d="M6.8 8.25h2.9" />
		</IconBase>
	);
}

export function IconOpenInNew(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M11 5.5h3.5V9" />
			<path d="m10 10 4.5-4.5" />
			<path d="M8.5 6H6A1.5 1.5 0 0 0 4.5 7.5V14A1.5 1.5 0 0 0 6 15.5h6.5A1.5 1.5 0 0 0 14 14v-2.5" />
		</IconBase>
	);
}

export function IconCheckCircle(props: IconProps) {
	return (
		<IconBase {...props}>
			<circle cx="10" cy="10" r="5.75" />
			<path d="m7.25 10 1.9 1.9 3.6-3.8" />
		</IconBase>
	);
}

export function IconAlertCircle(props: IconProps) {
	return (
		<IconBase {...props}>
			<circle cx="10" cy="10" r="5.75" />
			<path d="M10 7.25v3.5" />
			<circle
				cx="10"
				cy="13.2"
				r="0.7"
				fill="currentColor"
				stroke="none"
			/>
		</IconBase>
	);
}

export function IconRestore(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M6 8H3.75V5.75" />
			<path d="M4 8a6 6 0 1 1 .95 5.1" />
			<path d="M10 7v3l2 1.5" />
		</IconBase>
	);
}

export function IconUser(props: IconProps) {
	return (
		<IconBase {...props}>
			<circle cx="10" cy="7.25" r="2.25" />
			<path d="M5.5 14.75a4.5 4.5 0 0 1 9 0" />
		</IconBase>
	);
}

export function IconStar(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="m10 4.5 1.75 3.55 3.92.57-2.83 2.76.67 3.9L10 13.45 6.5 15.28l.67-3.9-2.84-2.76 3.93-.57Z" />
		</IconBase>
	);
}

export function IconTap(props: IconProps) {
	return (
		<IconBase {...props}>
			<path d="M10 4.5v2.25" />
			<path d="M7.75 6.2 9 7.45" />
			<path d="M12.25 6.2 11 7.45" />
			<path d="M8.5 10.25V9.1a1 1 0 1 1 2 0v3.9" />
			<path d="M10.5 10.6V9.4a1 1 0 1 1 2 0v4.35a1.75 1.75 0 0 1-1.75 1.75H9.4a2.4 2.4 0 0 1-1.86-.88l-1.04-1.28a.95.95 0 1 1 1.47-1.21l.53.65V10.25a1 1 0 1 1 2 0" />
		</IconBase>
	);
}

function IconBase({ size = 20, children, ...props }: IconProps) {
	return (
		<svg
			aria-hidden="true"
			fill="none"
			height={typeof size === "number" ? size : "2.5em"}
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.6"
			viewBox="0 0 20 20"
			width={typeof size === "number" ? size : "2.5em"}
			{...props}
		>
			{children}
		</svg>
	);
}
