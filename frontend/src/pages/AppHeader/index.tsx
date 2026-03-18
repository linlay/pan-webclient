import { useState, useEffect, useRef } from "react";
import { MaterialIcon } from "@/features/shared/Icons";
import { MenuButton } from "@/features/shared/MenuButton";
import { ThemeMode, ViewMode } from "@/types/home";

export interface AppHeaderProps {
	breadcrumbs: { label: string; path: string }[];
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
	onSetTheme: (theme: ThemeMode) => void;
	onToggleShowHidden: () => void;
	onToggleViewMode: (mode: ViewMode) => void;
	inspectorOpen?: boolean;
	onToggleInspector?: () => void;
}

export function AppHeader(props: AppHeaderProps) {
	const [localSearch, setLocalSearch] = useState(props.searchText);
	const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
	const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
		<header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white/80 dark:bg-bg-dark/80 backdrop-blur-md z-10">
			<div className="flex items-center gap-4">
				{props.isMobile ? (
					<div className="flex items-center gap-2">
						<button
							className="flex p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
							onClick={props.onOpenMobileNav}
							type="button"
						>
							<MaterialIcon name="menu" />
						</button>
						{props.breadcrumbs.length > 1 && (
							<button
								className="flex p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
							className="flex p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
							type="button"
							onClick={props.onNavigateUp}
							disabled={props.breadcrumbs.length <= 1}
						>
							<MaterialIcon name="chevron_left" />
						</button>
					</div>
				)}
				{/* Breadcrumb */}
				<nav className="flex items-center text-sm font-medium text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis max-w-[40vw]">
					{props.isMobile ? (
						<span className="text-slate-900 dark:text-white font-bold truncate">
							{props.breadcrumbs[props.breadcrumbs.length - 1]
								?.label || "Zenmind Pan"}
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
									<span className="text-slate-900 dark:text-white font-bold">
										{crumb.label}
									</span>
								) : (
									<button
										className="hover:text-primary transition-colors truncate max-w-[120px]"
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
						className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg"
						name="search"
					/>
					<input
						className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm placeholder:text-slate-400 outline-none transition-all"
						placeholder="Search files, folders..."
						type="text"
						value={localSearch}
						onChange={(e) => handleSearchChange(e.target.value)}
					/>
				</div>

				{/* Search Mobile Toggle */}
				{props.isMobile && (
					<button
						className="flex p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
						onClick={() => setIsMobileSearchOpen(true)}
						type="button"
					>
						<MaterialIcon name="search" />
					</button>
				)}

				{/* Mobile Search Overlay */}
				{props.isMobile && isMobileSearchOpen && (
					<div className="absolute inset-0 bg-white/95 dark:bg-bg-dark/95 backdrop-blur-md z-50 flex items-center px-4 gap-2 animate-fade-in">
						<button
							className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex-shrink-0"
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
								className="w-full pl-3 pr-10 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm placeholder:text-slate-400 outline-none transition-all"
								placeholder="Search..."
								type="text"
								value={localSearch}
								onChange={(e) =>
									handleSearchChange(e.target.value)
								}
							/>
							{localSearch && (
								<button
									className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
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
						<div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex-shrink-0">
							<button
								className={`p-1.5 rounded-md transition-all ${props.viewMode === "grid" ? "bg-white dark:bg-slate-700 shadow-sm text-primary" : "text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
								onClick={() => props.onToggleViewMode("grid")}
								type="button"
							>
								<MaterialIcon
									name="grid_view"
									className="text-lg"
								/>
							</button>
							<button
								className={`p-1.5 rounded-md transition-all ${props.viewMode === "list" ? "bg-white dark:bg-slate-700 shadow-sm text-primary" : "text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
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
				<div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-4 flex-shrink-0">
					<MenuButton
						actions={[
							{
								label: "Refresh",
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
									? "Hide Hidden Files"
									: "Show Hidden Files",
								icon: (
									<MaterialIcon
										name="visibility"
										className="text-sm"
									/>
								),
								onSelect: props.onToggleShowHidden,
							},
							{
								label: "System Theme",
								icon: (
									<MaterialIcon
										name="computer"
										className="text-sm"
									/>
								),
								onSelect: () => props.onSetTheme("system"),
							},
							{
								label: "Light Mode",
								icon: (
									<MaterialIcon
										name="light_mode"
										className="text-sm"
									/>
								),
								onSelect: () => props.onSetTheme("light"),
							},
							{
								label: "Dark Mode",
								icon: (
									<MaterialIcon
										name="dark_mode"
										className="text-sm"
									/>
								),
								onSelect: () => props.onSetTheme("dark"),
							},
							{
								label: "Log Out",
								icon: (
									<MaterialIcon
										name="logout"
										className="text-sm"
									/>
								),
								danger: true,
								onSelect: props.onLogout,
							},
						]}
						align="right"
						buttonClassName="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs overflow-hidden hover:bg-primary/30 transition-colors"
						buttonContent={<MaterialIcon name="person" />}
						buttonLabel="用户菜单"
					/>
				</div>
			</div>
		</header>
	);
}
