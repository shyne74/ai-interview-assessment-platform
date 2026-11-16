import React from "react";

export default function Button({
    children,
    variant = "primary", // primary | secondary | outline | ghost | danger
    size = "md",         // sm | md | lg
    loading = false,
    disabled = false,
    leftIcon = null,
    rightIcon = null,
    className = "",
    style = {},
    onClick,
    type = "button",
    ...props
}) {
    const isDisabled = disabled || loading;

    // Size specs
    const sizeStyles = {
        sm: { padding: "6px 12px", fontSize: "12.5px", borderRadius: "6px", gap: "6px" },
        md: { padding: "9px 18px", fontSize: "13.5px", borderRadius: "8px", gap: "8px" },
        lg: { padding: "12px 24px", fontSize: "15px", borderRadius: "10px", gap: "10px" }
    }[size] || { padding: "9px 18px", fontSize: "13.5px", borderRadius: "8px", gap: "8px" };

    // Variant specs
    const variantStyles = {
        primary: {
            backgroundColor: "var(--color-primary)",
            color: "#ffffff",
            border: "1px solid var(--color-primary)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
        },
        secondary: {
            backgroundColor: "#f1f5f9",
            color: "#0f172a",
            border: "1px solid #e2e8f0"
        },
        outline: {
            backgroundColor: "#ffffff",
            color: "#0f172a",
            border: "1px solid #cbd5e1",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
        },
        ghost: {
            backgroundColor: "transparent",
            color: "#475569",
            border: "1px solid transparent"
        },
        danger: {
            backgroundColor: "var(--color-danger)",
            color: "#ffffff",
            border: "1px solid var(--color-danger)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
        }
    }[variant] || {};

    const [isHovered, setIsHovered] = React.useState(false);
    const [isPressed, setIsPressed] = React.useState(false);

    let currentBg = variantStyles.backgroundColor;
    let currentBorder = variantStyles.border;
    let currentTransform = "none";

    if (!isDisabled) {
        if (isPressed) {
            currentTransform = "scale(0.975)";
            if (variant === "primary") currentBg = "var(--color-primary-active)";
            else if (variant === "danger") currentBg = "#b91c1c";
            else if (variant === "outline" || variant === "ghost") currentBg = "#f1f5f9";
        } else if (isHovered) {
            currentTransform = "translateY(-1px)";
            if (variant === "primary") currentBg = "var(--color-primary-hover)";
            else if (variant === "danger") currentBg = "var(--color-danger-hover)";
            else if (variant === "outline") {
                currentBg = "#f8fafc";
                currentBorder = "1px solid #94a3b8";
            } else if (variant === "ghost") {
                currentBg = "#f1f5f9";
            }
        }
    }

    return (
        <button
            type={type}
            disabled={isDisabled}
            onClick={isDisabled ? undefined : onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            aria-busy={loading}
            className={`ui-button ${className}`}
            style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "600",
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: disabled && !loading ? 0.55 : 1,
                transition: "all var(--motion-fast) var(--ease-standard)",
                transform: currentTransform,
                boxSizing: "border-box",
                userSelect: "none",
                whiteSpace: "nowrap",
                ...sizeStyles,
                ...variantStyles,
                backgroundColor: currentBg,
                border: currentBorder,
                ...style
            }}
            {...props}
        >
            {loading ? (
                <span
                    style={{
                        width: size === "sm" ? "14px" : "16px",
                        height: size === "sm" ? "14px" : "16px",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: variant === "outline" || variant === "ghost" ? "var(--color-primary)" : "#ffffff",
                        borderRadius: "50%",
                        animation: "spin 0.6s linear infinite",
                        display: "inline-block"
                    }}
                />
            ) : leftIcon ? (
                <span style={{ display: "inline-flex", alignItems: "center" }}>{leftIcon}</span>
            ) : null}

            <span>{children}</span>

            {!loading && rightIcon ? (
                <span style={{ display: "inline-flex", alignItems: "center" }}>{rightIcon}</span>
            ) : null}

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </button>
    );
}
