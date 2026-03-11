import { useState, useRef, useEffect, useCallback } from "react";

export interface ResizableSidebarProps {
	children: React.ReactNode;
	side: "left" | "right";
	defaultWidth?: number;
	minWidth?: number;
	maxWidth?: number;
	className?: string;
	style?: React.CSSProperties;
	onWidthChange?: (width: number) => void;
}

export function ResizableSidebar({
	children,
	side,
	defaultWidth = 256,
	minWidth = 200,
	maxWidth = 500,
	className = "",
	style,
	onWidthChange,
}: ResizableSidebarProps) {
	const [width, setWidth] = useState(defaultWidth);
	const isResizing = useRef(false);

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isResizing.current) return;
			e.preventDefault();

			let newWidth;
			if (side === "left") {
				newWidth = e.clientX;
			} else {
				newWidth = window.innerWidth - e.clientX;
			}

			newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
			setWidth(newWidth);
			if (onWidthChange) onWidthChange(newWidth);
		},
		[maxWidth, minWidth, side, onWidthChange],
	);

	useEffect(() => {
		function handleMouseUp() {
			if (isResizing.current) {
				isResizing.current = false;
				document.body.style.cursor = "default";
				document.body.style.userSelect = "auto";
			}
		}

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [handleMouseMove]);

	// Export CSS var if right side
	useEffect(() => {
		if (side === "right") {
			document.documentElement.style.setProperty(
				"--inspector-width",
				`${width}px`,
			);
		}
		return () => {
			if (side === "right") {
				document.documentElement.style.removeProperty(
					"--inspector-width",
				);
			}
		};
	}, [side, width]);

	const handleMouseDown = (e: React.MouseEvent) => {
		isResizing.current = true;
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
		e.preventDefault();
	};

	return (
		<aside
			className={`flex-shrink-0 flex flex-col ${className.includes("fixed") || className.includes("absolute") ? "" : "relative"} ${className}`}
			style={
				className.includes("fixed") || className.includes("absolute")
					? { ...style } // Do not force explicit inline width if it's already an overlay
					: { width: `${width}px`, ...style }
			}
		>
			{children}

			{/* Resizer Handle */}
			<div
				className={`absolute top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/20 hover:backdrop-blur-sm z-50 transition-colors ${
					side === "left" ? "-right-0.5" : "-left-0.5"
				}`}
				onMouseDown={handleMouseDown}
			/>
		</aside>
	);
}
