import { useEffect, useRef, useState, useLayoutEffect } from "react";

export function MenuButton(props: {
	actions: Array<{
		label: string;
		icon?: React.ReactNode;
		onSelect: () => void;
		danger?: boolean;
		disabled?: boolean;
	}>;
	buttonContent: React.ReactNode;
	buttonLabel?: string;
	buttonClassName?: string;
	align?: "left" | "right";
}) {
	const [open, setOpen] = useState(false);
	const [dropUp, setDropUp] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	// Click outside to close
	useEffect(() => {
		if (!open) {
			// Reset direction for next calculation
			setDropUp(false);
			return;
		}
		const close = (e: MouseEvent | TouchEvent) => {
			if (
				rootRef.current &&
				!rootRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", close);
		document.addEventListener("touchstart", close);
		return () => {
			document.removeEventListener("mousedown", close);
			document.removeEventListener("touchstart", close);
		};
	}, [open]);

	// Collision detection
	useLayoutEffect(() => {
		if (open && menuRef.current) {
			const rect = menuRef.current.getBoundingClientRect();
			if (rect.bottom > window.innerHeight - 20) {
				setDropUp(true);
			} else {
				setDropUp(false);
			}
		}
	}, [open]);

	return (
		<div className="relative" ref={rootRef}>
			<button
				aria-label={props.buttonLabel}
				className={
					props.buttonClassName ??
					"rounded-[4px] p-2 transition-colors hover:bg-panel-wash dark:hover:bg-night-3"
				}
				onClick={(e) => {
					e.stopPropagation();
					setOpen(!open);
				}}
				type="button"
			>
				{props.buttonContent}
			</button>

			{open ? (
				<div
					ref={menuRef}
					className={`absolute z-[100] w-48 rounded-[8px] border border-sidebar-border bg-white/95 py-1.5 animate-fade-in dark:border-white/10 dark:bg-night-2/95 ${
						dropUp ? "bottom-full mb-2" : "top-full mt-2"
					} ${props.align === "right" ? "right-0" : "left-0"}`}
				>
					{props.actions.map((action, index) => (
						<button
							key={index}
							className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors text-left ${
								action.danger
									? "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
									: "text-heading-text hover:bg-panel-wash dark:text-[#f4f8ff]/88 dark:hover:bg-night-3"
							} ${action.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
							disabled={action.disabled}
							onClick={(e) => {
								e.stopPropagation();
								if (!action.disabled) {
									action.onSelect();
									setOpen(false);
								}
							}}
							type="button"
						>
							{action.icon ? (
								<span className="w-4 flex justify-center">
									{action.icon}
								</span>
							) : null}
							<span>{action.label}</span>
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}
