import React from "react";

export default function Skeleton({
    variant = "text", // text | title | card | avatar | button | rect
    width,
    height,
    borderRadius,
    className = "",
    style = {},
    ...props
}) {
    const defaultDimensions = {
        text: { width: "100%", height: "14px", borderRadius: "var(--radius-xs)" },
        title: { width: "60%", height: "24px", borderRadius: "var(--radius-sm)" },
        avatar: { width: "40px", height: "40px", borderRadius: "var(--radius-full)" },
        button: { width: "100px", height: "36px", borderRadius: "var(--radius-md)" },
        card: { width: "100%", height: "200px", borderRadius: "var(--radius-lg)" },
        rect: { width: "100%", height: "80px", borderRadius: "var(--radius-md)" }
    }[variant] || { width: "100%", height: "16px", borderRadius: "var(--radius-xs)" };

    return (
        <div
            aria-hidden="true"
            className={`skeleton-shimmer ${className}`}
            style={{
                width: width || defaultDimensions.width,
                height: height || defaultDimensions.height,
                borderRadius: borderRadius || defaultDimensions.borderRadius,
                display: "inline-block",
                boxSizing: "border-box",
                ...style
            }}
            {...props}
        />
    );
}
