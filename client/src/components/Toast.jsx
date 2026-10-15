import React, { useEffect } from "react";
import { CheckCircleIcon, AlertTriangleIcon, XCircleIcon } from "./icons";

export function Toast({ message, type = "info", onClose, duration = 4000 }) {
    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [message, duration, onClose]);

    if (!message) return null;

    const bgMap = {
        success: "bg-emerald-900 border-emerald-500 text-emerald-100",
        error: "bg-rose-900 border-rose-500 text-rose-100",
        warning: "bg-amber-900 border-amber-500 text-amber-100",
        info: "bg-indigo-900 border-indigo-500 text-indigo-100"
    };

    const iconMap = {
        success: <CheckCircleIcon size={18} className="text-emerald-400" />,
        error: <XCircleIcon size={18} className="text-rose-400" />,
        warning: <AlertTriangleIcon size={18} className="text-amber-400" />,
        info: <CheckCircleIcon size={18} className="text-indigo-400" />
    };

    return (
        <div
            className="toast-notification d-flex align-items-center gap-3 px-4 py-3 shadow-lg rounded-3"
            style={{
                position: "fixed",
                bottom: "24px",
                right: "24px",
                zIndex: 9999,
                backgroundColor: type === "success" ? "#064e3b" : type === "error" ? "#881337" : type === "warning" ? "#78350f" : "#1e1b4b",
                color: "#f8fafc",
                border: `1px solid ${type === "success" ? "#10b981" : type === "error" ? "#f43f5e" : type === "warning" ? "#f59e0b" : "#6366f1"}`,
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
                minWidth: "320px",
                maxWidth: "480px",
                animation: "toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
        >
            <div className="flex-shrink-0">{iconMap[type]}</div>
            <div className="flex-grow-1 fs-6">{message}</div>
            <button
                type="button"
                className="btn-close btn-close-white ms-auto"
                style={{ fontSize: "0.8rem" }}
                onClick={onClose}
                aria-label="Close"
            />
        </div>
    );
}

export default Toast;
