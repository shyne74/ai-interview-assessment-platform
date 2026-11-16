import React from "react";

export default function Badge({
    children,
    variant = "neutral", // success | warning | danger | info | neutral
    size = "sm",         // sm | md
    className = "",
    style = {},
    ...props
}) {
    const variantStyles = {
        success: {
            backgroundColor: "var(--color-primary-light)",
            color: "var(--color-primary-active)",
            border: "1px solid var(--color-primary-border)"
        },
        warning: {
            backgroundColor: "var(--color-warning-light)",
            color: "var(--color-warning-text)",
            border: "1px solid var(--color-warning-border)"
        },
        danger: {
            backgroundColor: "var(--color-danger-light)",
            color: "var(--color-danger-text)",
            border: "1px solid var(--color-danger-border)"
        },
        info: {
            backgroundColor: "var(--color-info-light)",
            color: "var(--color-info-text)",
            border: "1px solid var(--color-info-border)"
        },
        neutral: {
            backgroundColor: "var(--color-surface-secondary)",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)"
        }
    }[variant] || {
        backgroundColor: "var(--color-surface-secondary)",
        color: "var(--color-text-secondary)",
        border: "1px solid var(--color-border)"
    };

    const sizeStyles = size === "md"
        ? { padding: "4px 10px", fontSize: "12px", borderRadius: "var(--radius-full)" }
        : { padding: "2.5px 8px", fontSize: "11px", borderRadius: "var(--radius-full)" };

    return (
        <span
            className={`ui-badge ${className}`}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontWeight: "600",
                letterSpacing: "0.02em",
                lineHeight: "1.2",
                boxSizing: "border-box",
                ...variantStyles,
                ...sizeStyles,
                ...style
            }}
            {...props}
        >
            {children}
        </span>
    );
}
