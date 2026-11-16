import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext({
    showToast: () => {},
    success: () => {},
    error: () => {},
    warning: () => {},
    info: () => {}
});

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((message, type = "info", duration = 4000) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast = { id, message, type };

        setToasts((prev) => [...prev.slice(-4), newToast]); // keep max 5 toasts

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
        return id;
    }, [removeToast]);

    const success = useCallback((msg, dur) => showToast(msg, "success", dur), [showToast]);
    const error = useCallback((msg, dur) => showToast(msg, "error", dur), [showToast]);
    const warning = useCallback((msg, dur) => showToast(msg, "warning", dur), [showToast]);
    const info = useCallback((msg, dur) => showToast(msg, "info", dur), [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
            {children}
            {/* Toast Container */}
            <div
                aria-live="polite"
                aria-atomic="true"
                style={{
                    position: "fixed",
                    bottom: "24px",
                    right: "24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    zIndex: 2000,
                    pointerEvents: "none"
                }}
            >
                {toasts.map((t) => {
                    const typeConfig = {
                        success: {
                            icon: "✓",
                            bg: "#ffffff",
                            border: "1px solid var(--color-primary-border)",
                            accent: "var(--color-primary)",
                            textColor: "var(--color-text)"
                        },
                        error: {
                            icon: "✕",
                            bg: "#ffffff",
                            border: "1px solid var(--color-danger-border)",
                            accent: "var(--color-danger)",
                            textColor: "var(--color-text)"
                        },
                        warning: {
                            icon: "⚠",
                            bg: "#ffffff",
                            border: "1px solid var(--color-warning-border)",
                            accent: "var(--color-warning)",
                            textColor: "var(--color-text)"
                        },
                        info: {
                            icon: "ℹ",
                            bg: "#ffffff",
                            border: "1px solid var(--color-info-border)",
                            accent: "var(--color-info)",
                            textColor: "var(--color-text)"
                        }
                    }[t.type] || {
                        icon: "ℹ",
                        bg: "#ffffff",
                        border: "1px solid var(--color-border)",
                        accent: "var(--color-primary)",
                        textColor: "var(--color-text)"
                    };

                    return (
                        <div
                            key={t.id}
                            role="status"
                            style={{
                                pointerEvents: "auto",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                minWidth: "280px",
                                maxWidth: "420px",
                                padding: "12px 16px",
                                backgroundColor: typeConfig.bg,
                                border: typeConfig.border,
                                borderRadius: "var(--radius-md)",
                                boxShadow: "var(--shadow-lg)",
                                animation: "toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                borderLeft: `4px solid ${typeConfig.accent}`
                            }}
                        >
                            <span style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "50%",
                                backgroundColor: t.type === "success" ? "var(--color-primary-light)" : t.type === "error" ? "var(--color-danger-light)" : "var(--color-surface-secondary)",
                                color: typeConfig.accent,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "12px",
                                fontWeight: "700",
                                flexShrink: 0
                            }}>
                                {typeConfig.icon}
                            </span>
                            <span style={{ fontSize: "13.5px", fontWeight: "500", color: typeConfig.textColor, flex: 1, lineHeight: "1.4" }}>
                                {t.message}
                            </span>
                            <button
                                type="button"
                                onClick={() => removeToast(t.id)}
                                aria-label="Dismiss toast"
                                style={{
                                    background: "none",
                                    border: "none",
                                    fontSize: "14px",
                                    color: "var(--color-text-muted)",
                                    cursor: "pointer",
                                    padding: "2px 6px"
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    );
                })}
            </div>

            <style>{`
                @keyframes toastSlideIn {
                    from { opacity: 0; transform: translateY(12px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}
