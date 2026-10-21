import React from "react";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: "100vh",
                    backgroundColor: "#0f172a",
                    color: "#f8fafc",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "24px",
                    fontFamily: "system-ui, -apple-system, sans-serif"
                }}>
                    <div style={{
                        maxWidth: "600px",
                        width: "100%",
                        backgroundColor: "rgba(30, 41, 59, 0.95)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        borderRadius: "16px",
                        padding: "32px",
                        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
                        textAlign: "center"
                    }}>
                        <div style={{
                            width: "56px",
                            height: "56px",
                            borderRadius: "50%",
                            backgroundColor: "rgba(239, 68, 68, 0.15)",
                            color: "#ef4444",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "28px",
                            marginBottom: "16px"
                        }}>
                            ⚠️
                        </div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "8px" }}>
                            Something went wrong
                        </h2>
                        <p style={{ color: "#94a3b8", fontSize: "0.925rem", marginBottom: "20px" }}>
                            An unexpected rendering error occurred. The application has safely caught the exception to prevent complete failure.
                        </p>
                        {this.state.error && (
                            <pre style={{
                                backgroundColor: "rgba(15, 23, 42, 0.8)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                borderRadius: "8px",
                                padding: "12px",
                                textAlign: "left",
                                fontSize: "0.8rem",
                                color: "#f87171",
                                overflowX: "auto",
                                marginBottom: "24px"
                            }}>
                                {this.state.error.toString()}
                            </pre>
                        )}
                        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                            <button
                                onClick={() => window.location.reload()}
                                style={{
                                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                                    color: "#fff",
                                    border: "1px solid rgba(255, 255, 255, 0.2)",
                                    borderRadius: "8px",
                                    padding: "10px 20px",
                                    fontWeight: "600",
                                    cursor: "pointer"
                                }}
                            >
                                Reload Page
                            </button>
                            <button
                                onClick={() => { window.location.href = "/dashboard"; }}
                                style={{
                                    background: "linear-gradient(135deg, #6366f1, #06b6d4)",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "8px",
                                    padding: "10px 20px",
                                    fontWeight: "600",
                                    cursor: "pointer"
                                }}
                            >
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
