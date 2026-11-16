import React from "react";

export default function ProgressBar({
    value = 0, // 0 to 100
    max = 100,
    variant = "primary", // primary | warning | danger
    height = "6px",
    borderRadius = "var(--radius-full)",
    className = "",
    style = {},
    ...props
}) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    const color = {
        primary: "var(--color-primary)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)"
    }[variant] || "var(--color-primary)";

    return (
        <div
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
            className={`ui-progress-track ${className}`}
            style={{
                width: "100%",
                height,
                backgroundColor: "var(--color-surface-secondary)",
                borderRadius,
                overflow: "hidden",
                boxSizing: "border-box",
                ...style
            }}
            {...props}
        >
            <div
                className="ui-progress-bar"
                style={{
                    width: `${percentage}%`,
                    height: "100%",
                    backgroundColor: color,
                    borderRadius,
                    transition: "width var(--motion-slow) var(--ease-standard)"
                }}
            />
        </div>
    );
}
