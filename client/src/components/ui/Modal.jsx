import React, { useEffect, useRef } from "react";

export default function Modal({
    isOpen = false,
    onClose,
    title,
    children,
    maxWidth = "520px",
    showCloseButton = true,
    className = ""
}) {
    const dialogRef = useRef(null);

    // Esc key close
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                onClose && onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
            style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(15, 23, 42, 0.45)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
                padding: "16px",
                animation: "fadeIn 0.15s ease"
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose && onClose();
            }}
        >
            <div
                ref={dialogRef}
                className={`ui-modal-panel ${className}`}
                style={{
                    backgroundColor: "var(--color-surface)",
                    borderRadius: "var(--radius-xl)",
                    border: "1px solid var(--color-border)",
                    boxShadow: "var(--shadow-xl)",
                    width: "100%",
                    maxWidth,
                    maxHeight: "90vh",
                    overflowY: "auto",
                    padding: "24px",
                    boxSizing: "border-box",
                    position: "relative",
                    animation: "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
            >
                {(title || showCloseButton) && (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "16px",
                        borderBottom: "1px solid var(--color-border-subtle)",
                        paddingBottom: "12px"
                    }}>
                        {title && (
                            <h2 id="modal-title" style={{
                                fontSize: "17px",
                                fontWeight: "700",
                                color: "var(--color-text)",
                                margin: 0
                            }}>
                                {title}
                            </h2>
                        )}
                        {showCloseButton && (
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close dialog"
                                style={{
                                    background: "none",
                                    border: "none",
                                    fontSize: "18px",
                                    cursor: "pointer",
                                    color: "var(--color-text-muted)",
                                    borderRadius: "var(--radius-sm)",
                                    padding: "4px 8px",
                                    lineHeight: "1"
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                )}

                <div>{children}</div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
