import React from "react";
import Button from "./Button";

export default function EmptyState({
    icon = "✨",
    title = "Nothing here yet",
    description = "When you take actions or start assessments, they will appear here.",
    actionLabel,
    onAction,
    className = "",
    style = {},
    ...props
}) {
    return (
        <div
            className={`ui-empty-state ${className}`}
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "36px 24px",
                borderRadius: "var(--radius-lg)",
                backgroundColor: "var(--color-surface)",
                border: "1px dashed var(--color-border)",
                boxSizing: "border-box",
                ...style
            }}
            {...props}
        >
            <div style={{ fontSize: "36px", marginBottom: "12px", lineHeight: "1" }}>
                {icon}
            </div>
            <h3 style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "var(--color-text)",
                margin: "0 0 6px 0"
            }}>
                {title}
            </h3>
            <p style={{
                fontSize: "13.5px",
                color: "var(--color-text-secondary)",
                maxWidth: "420px",
                margin: actionLabel ? "0 0 18px 0" : "0",
                lineHeight: "1.5"
            }}>
                {description}
            </p>
            {actionLabel && onAction && (
                <Button variant="primary" size="sm" onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
