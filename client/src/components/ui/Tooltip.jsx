import React, { useState } from "react";

export default function Tooltip({
    children,
    content,
    position = "top", // top | bottom
    className = "",
    style = {}
}) {
    const [visible, setVisible] = useState(false);

    if (!content) return children;

    return (
        <span
            className={`ui-tooltip-wrapper ${className}`}
            style={{ position: "relative", display: "inline-flex", ...style }}
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
            onFocus={() => setVisible(true)}
            onBlur={() => setVisible(false)}
        >
            {children}
            {visible && (
                <span
                    role="tooltip"
                    className="ui-tooltip-content"
                    style={{
                        position: "absolute",
                        [position === "bottom" ? "top" : "bottom"]: "calc(100% + 6px)",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: "#1e293b",
                        color: "#ffffff",
                        padding: "5px 10px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "11.5px",
                        fontWeight: "500",
                        whiteSpace: "nowrap",
                        zIndex: 100,
                        boxShadow: "var(--shadow-md)",
                        pointerEvents: "none",
                        animation: "fadeInUp 0.15s ease forwards"
                    }}
                >
                    {content}
                </span>
            )}
        </span>
    );
}
