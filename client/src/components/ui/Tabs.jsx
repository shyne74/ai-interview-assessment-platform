import React from "react";

export default function Tabs({
    tabs = [], // [{ id, label, icon, badge }]
    activeTab,
    onChange,
    className = "",
    style = {}
}) {
    return (
        <div
            role="tablist"
            className={`ui-tabs-container ${className}`}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px",
                backgroundColor: "var(--color-surface-secondary)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                boxSizing: "border-box",
                ...style
            }}
        >
            {tabs.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                    <button
                        key={tab.id}
                        role="tab"
                        type="button"
                        aria-selected={isActive}
                        onClick={() => onChange && onChange(tab.id)}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 14px",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "13px",
                            fontWeight: isActive ? "700" : "500",
                            color: isActive ? "var(--color-primary-hover)" : "var(--color-text-secondary)",
                            backgroundColor: isActive ? "var(--color-surface)" : "transparent",
                            boxShadow: isActive ? "var(--shadow-xs)" : "none",
                            border: "none",
                            cursor: "pointer",
                            transition: "all var(--motion-fast) var(--ease-standard)",
                            whiteSpace: "nowrap"
                        }}
                    >
                        {tab.icon && <span>{tab.icon}</span>}
                        <span>{tab.label}</span>
                        {tab.badge !== undefined && (
                            <span style={{
                                fontSize: "11px",
                                padding: "1px 6px",
                                borderRadius: "var(--radius-full)",
                                backgroundColor: isActive ? "var(--color-primary-light)" : "var(--color-surface-tertiary)",
                                color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
                                fontWeight: "700"
                            }}>
                                {tab.badge}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
