import React from "react";

export default function Card({
    children,
    interactive = false,
    className = "",
    style = {},
    onClick,
    ...props
}) {
    const [isHovered, setIsHovered] = React.useState(false);
    const [isPressed, setIsPressed] = React.useState(false);

    let currentTransform = "none";
    let currentShadow = "var(--shadow-xs)";
    let currentBorderColor = "var(--color-border)";

    if (interactive) {
        if (isPressed) {
            currentTransform = "scale(0.985)";
            currentShadow = "var(--shadow-pressed)";
        } else if (isHovered) {
            currentTransform = "translateY(-4px)";
            currentShadow = "var(--shadow-hover)";
            currentBorderColor = "var(--color-border-hover)";
        }
    }

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => interactive && setIsHovered(true)}
            onMouseLeave={() => {
                if (interactive) {
                    setIsHovered(false);
                    setIsPressed(false);
                }
            }}
            onMouseDown={() => interactive && setIsPressed(true)}
            onMouseUp={() => interactive && setIsPressed(false)}
            className={`ui-card ${interactive ? "ui-card-interactive" : ""} ${className}`}
            style={{
                backgroundColor: "var(--color-surface)",
                border: `1px solid ${currentBorderColor}`,
                borderRadius: "var(--radius-lg)",
                boxShadow: currentShadow,
                transform: currentTransform,
                transition: "transform var(--motion-base) var(--ease-standard), box-shadow var(--motion-base) var(--ease-standard), border-color var(--motion-base) var(--ease-standard)",
                cursor: interactive ? "pointer" : "default",
                boxSizing: "border-box",
                ...style
            }}
            {...props}
        >
            {children}
        </div>
    );
}
