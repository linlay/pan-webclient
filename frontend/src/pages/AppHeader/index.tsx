import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { shouldShowLogoutAction } from "@/api/routing";
import { LanguageMenuButton } from "@/features/shared/LanguageMenuButton";
import { MaterialIcon } from "@/features/shared/Icons";
import { MenuButton } from "@/features/shared/MenuButton";
import { ThemeMode, ViewMode } from "@/types/home";

export interface AppHeaderProps {
	breadcrumbs: { label: string; path: string }[];
	canShareCurrentFolder: boolean;
	isMobile: boolean;
	searchText: string;
	showHidden: boolean;
	viewMode: ViewMode;
	onLogout: () => void;
	onNavigateBreadcrumb: (path: string) => void;
	onNavigateUp: () => void;
	onOpenMobileNav: () => void;
	onRefresh: () => void;
	onSearchChange: (val: string) => void;
	onShareCurrentFolder: () => void;
	onSetTheme: (theme: ThemeMode) => void;
	onToggleShowHidden: () => void;
	onToggleViewMode: (mode: ViewMode) => void;
	inspectorOpen?: boolean;
	onToggleInspector?: () => void;
}

export function AppHeader(props: AppHeaderProps) {
	const { t } = useTranslation();
	const [localSearch, setLocalSearch] = useState(props.searchText);
	const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
	const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const showLogoutAction = shouldShowLogoutAction();

	// Sync external changes (if any)
	useEffect(() => {
		setLocalSearch(props.searchText);
	}, [props.searchText]);

	const handleSearchChange = (val: string) => {
		setLocalSearch(val);
		if (searchTimeoutRef.current) {
			clearTimeout(searchTimeoutRef.current);
		}
		searchTimeoutRef.current = setTimeout(() => {
			props.onSearchChange(val);
		}, 400);
	};

	return (
		<header className="z-10 flex h-16 items-center justify-between border-b border-sidebar-border bg-white/82 px-6 backdrop-blur-md dark:border-white/10 dark:bg-night-1/90">
			<div className="flex items-center gap-4">
				{props.isMobile ? (
					<div className="flex items-center gap-2">
						<button
							className="flex rounded-[4px] p-1.5 transition-colors hover:bg-panel-wash dark:hover:bg-night-3"
							onClick={props.onOpenMobileNav}
							type="button"
						>
							<MaterialIcon name="menu" />
						</button>
						{props.breadcrumbs.length > 1 && (
							<button
								className="flex rounded-[4px] p-1.5 text-body-text/65 transition-colors hover:bg-panel-wash hover:text-heading-text dark:text-[#97A3B7]/78 dark:hover:bg-night-3 dark:hover:text-white"
								onClick={props.onNavigateUp}
								type="button"
							>
								<MaterialIcon name="chevron_left" />
							</button>
						)}
					</div>
				) : (
					<div className="flex items-center gap-1">
						<button
							className="flex rounded-[4px] p-1.5 text-body-text/65 transition-colors hover:bg-panel-wash hover:text-heading-text disabled:cursor-not-allowed disabled:opacity-30 dark:text-[#97A3B7]/78 dark:hover:bg-night-3 dark:hover:text-white"
							type="button"
							onClick={props.onNavigateUp}
							disabled={props.breadcrumbs.length <= 1}
						>
							<MaterialIcon name="chevron_left" />
						</button>
					</div>
				)}
				{/* Breadcrumb */}
				<nav className="flex max-w-[40vw] items-center overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium text-body-text">
					{props.isMobile ? (
						<span className="truncate font-bold text-heading-text dark:text-white">
								{props.breadcrumbs[props.breadcrumbs.length - 1]
									?.label || t("common.appName")}
						</span>
					) : (
						props.breadcrumbs.map((crumb, index) => (
							<span
								key={crumb.path}
								className="flex items-center"
							>
								{index > 0 ? (
									<MaterialIcon
										className="text-xs mx-1"
										name="chevron_right"
									/>
								) : null}
								{index === props.breadcrumbs.length - 1 ? (
									<span className="font-bold text-heading-text dark:text-white">
										{crumb.label}
									</span>
								) : (
									<button
										className="max-w-[120px] truncate transition-colors hover:text-primary dark:hover:text-[#78A9FF]"
										onClick={() =>
											props.onNavigateBreadcrumb(
												crumb.path,
											)
										}
										type="button"
									>
										{crumb.label}
									</button>
								)}
							</span>
						))
					)}
				</nav>
			</div>

			<div className="flex items-center gap-4 flex-1 justify-end min-w-0">
				{/* Search Desktop */}
				<div className="relative max-w-md w-full hidden sm:block">
					<MaterialIcon
						className="absolute left-3 top-1/2 -translate-y-1/2 text-body-text/55 text-lg dark:text-[#97A3B7]/78"
						name="search"
					/>
						<input
							className="w-full rounded-[4px] border border-sidebar-border bg-panel-wash/85 py-2 pl-10 pr-4 text-sm text-heading-text outline-none transition-all placeholder:text-body-text/50 focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-white/10 dark:bg-night-2/88 dark:text-white dark:placeholder:text-[#97A3B7]/70"
							placeholder={t("header.searchFilesPlaceholder")}
							type="text"
						value={localSearch}
						onChange={(e) => handleSearchChange(e.target.value)}
					/>
				</div>

				{/* Search Mobile Toggle */}
				{props.isMobile && (
					<button
						className="flex rounded-[4px] p-1.5 text-body-text/65 transition-colors hover:bg-panel-wash hover:text-heading-text dark:text-[#97A3B7]/78 dark:hover:bg-night-3 dark:hover:text-white"
						onClick={() => setIsMobileSearchOpen(true)}
						type="button"
					>
						<MaterialIcon name="search" />
					</button>
				)}

				{/* Mobile Search Overlay */}
				{props.isMobile && isMobileSearchOpen && (
					<div className="absolute inset-0 z-50 flex items-center gap-2 bg-white/96 px-4 backdrop-blur-md animate-fade-in dark:bg-night-1/96">
						<button
							className="shrink-0 rounded-[4px] p-1.5 text-body-text/65 transition-colors hover:bg-panel-wash hover:text-heading-text dark:text-[#97A3B7]/78 dark:hover:bg-night-3 dark:hover:text-white"
							onClick={() => {
								setIsMobileSearchOpen(false);
								handleSearchChange("");
							}}
							type="button"
						>
							<MaterialIcon name="arrow_back" />
						</button>
						<div className="relative flex-1">
								<input
									autoFocus
									className="w-full rounded-[4px] border border-sidebar-border bg-panel-wash/85 py-2 pl-3 pr-10 text-sm text-heading-text outline-none transition-all placeholder:text-body-text/50 focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-white/10 dark:bg-night-2/88 dark:text-white dark:placeholder:text-[#97A3B7]/70"
									placeholder={t("header.searchPlaceholder")}
									type="text"
								value={localSearch}
								onChange={(e) =>
									handleSearchChange(e.target.value)
								}
							/>
							{localSearch && (
								<button
									className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-body-text/60 hover:text-heading-text dark:text-[#97A3B7]/78 dark:hover:text-white"
									onClick={() => handleSearchChange("")}
									type="button"
								>
									<MaterialIcon
										name="close"
										className="text-sm"
									/>
								</button>
							)}
						</div>
					</div>
				)}

				{/* View toggle & Sidebar toggle */}
				{!props.isMobile && (
					<div className="flex items-center gap-2 flex-shrink-0">
						<div className="flex flex-shrink-0 items-center rounded-[4px] border border-sidebar-border bg-sidebar-bg/90 p-0.5 dark:border-white/10 dark:bg-night-2/88">
							<button
								className={`rounded-[3px] p-1.5 transition-all ${props.viewMode === "grid" ? "border border-primary/10 bg-white text-primary dark:border-dark-primary/30 dark:bg-night-3 dark:text-[#78A9FF]" : "text-body-text/65 hover:text-heading-text dark:text-[#97A3B7]/78 dark:hover:text-white"}`}
								onClick={() => props.onToggleViewMode("grid")}
								type="button"
							>
								<MaterialIcon
									name="grid_view"
									className="text-lg"
								/>
							</button>
							<button
								className={`rounded-[3px] p-1.5 transition-all ${props.viewMode === "list" ? "border border-primary/10 bg-white text-primary dark:border-dark-primary/30 dark:bg-night-3 dark:text-[#78A9FF]" : "text-body-text/65 hover:text-heading-text dark:text-[#97A3B7]/78 dark:hover:text-white"}`}
								onClick={() => props.onToggleViewMode("list")}
								type="button"
							>
								<MaterialIcon
									name="view_list"
									className="text-lg"
								/>
							</button>
						</div>
					</div>
				)}

				{/* User actions */}
				<div className="flex flex-shrink-0 items-center gap-2 border-l border-sidebar-border pl-4 dark:border-white/10">
					<LanguageMenuButton compact />
					<MenuButton
						actions={[
							...(props.isMobile && props.canShareCurrentFolder
								? [
										{
											label: t("toolbar.shareFolder"),
											icon: (
												<MaterialIcon
													name="folder"
													className="text-sm filled-icon"
												/>
											),
											onSelect: props.onShareCurrentFolder,
											},
										]
									: []),
							{
								label: t("common.refresh"),
								icon: (
									<MaterialIcon
										name="refresh"
										className="text-sm"
									/>
								),
								onSelect: props.onRefresh,
							},
							{
								label: props.showHidden
									? t("header.hideHiddenFiles")
									: t("header.showHiddenFiles"),
								icon: (
									<MaterialIcon
										name="visibility"
										className="text-sm"
									/>
								),
								onSelect: props.onToggleShowHidden,
							},
							{
								label: t("header.systemTheme"),
								icon: (
									<MaterialIcon
										name="computer"
										className="text-sm"
									/>
								),
								onSelect: () => props.onSetTheme("system"),
							},
							{
								label: t("header.lightMode"),
								icon: (
									<MaterialIcon
										name="light_mode"
										className="text-sm"
									/>
								),
								onSelect: () => props.onSetTheme("light"),
							},
							{
								label: t("header.darkMode"),
								icon: (
									<MaterialIcon
										name="dark_mode"
										className="text-sm"
									/>
								),
								onSelect: () => props.onSetTheme("dark"),
							},
							...(showLogoutAction
								? [
										{
											label: t("header.logOut"),
											icon: (
												<MaterialIcon
													name="logout"
													className="text-sm"
												/>
											),
											danger: true,
											onSelect: props.onLogout,
										},
									]
								: []),
						]}
						align="right"
						buttonClassName="flex h-8 w-8 items-center justify-center overflow-hidden rounded-[4px] border border-primary/15 bg-panel-wash text-primary text-xs font-bold transition-colors hover:bg-white dark:border-dark-primary/24 dark:bg-night-2/88 dark:text-[#78A9FF] dark:hover:bg-night-3"
						buttonContent={<MaterialIcon name="person" />}
						buttonLabel={t("header.userMenu")}
					/>
				</div>
			</div>
		</header>
	);
}
