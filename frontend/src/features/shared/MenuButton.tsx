import { useEffect, useRef, useState } from "react";

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
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const close = (e: MouseEvent) => {
			if (
				rootRef.current &&
				!rootRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", close);
		return () => document.removeEventListener("mousedown", close);
	}, [open]);

	return (
		<div className="relative" ref={rootRef}>
			<button
				aria-label={props.buttonLabel}
				className={
					props.buttonClassName ??
					"p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
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
					className={`absolute top-full mt-2 z-30 w-48 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl animate-fade-in ${
						props.align === "right" ? "right-0" : "left-0"
					}`}
				>
					{props.actions.map((action, index) => (
						<button
							key={index}
							className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors text-left ${
								action.danger
									? "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
									: "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
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
