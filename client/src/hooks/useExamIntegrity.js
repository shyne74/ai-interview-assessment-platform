import { useState, useEffect, useRef, useCallback } from "react";
import api from "../services/api";

/**
 * Custom hook for exam integrity monitoring, fullscreen enforcement,
 * violation logging, client heartbeat, and keystroke telemetry.
 *
 * NOTE ON EXAM INTEGRITY LIMITS:
 * Browser environments cannot completely block Alt+Tab, OS level app switching,
 * multiple monitors, or secondary physical devices (e.g. mobile phones).
 * This module provides layered detection, immediate warnings, and auto-submission
 * upon configurable threshold breaches. For strict lockdown environments,
 * a native desktop/kiosk wrapper (e.g. Electron with kiosk mode) should be used.
 */
export function useExamIntegrity({
    examId,
    examType = "interview", // "interview" | "adaptive"
    currentQuestionIndex = 0,
    maxViolations = 2,
    heartbeatIntervalMs = 15000,
    onAutoSubmit,
    isCompleted = false,
    isStarted = true
}) {
    const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
    const [violationCount, setViolationCount] = useState(0);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [lastViolationMsg, setLastViolationMsg] = useState("");
    const [autoSubmitted, setAutoSubmitted] = useState(false);

    // Keystroke telemetry state per answer index
    const telemetryRef = useRef({
        pasteAttempts: 0,
        copyAttempts: 0,
        keystrokesCount: 0,
        totalCharsTyped: 0,
        largestInsertLength: 0,
        typingStartTime: null,
        typingDurationMs: 0,
        lastTextLength: 0
    });

    const isCompletedRef = useRef(isCompleted);
    useEffect(() => {
        isCompletedRef.current = isCompleted;
    }, [isCompleted]);

    const violationEndpoint = examType === "adaptive"
        ? `/adaptive/${examId}/violation`
        : `/interviews/${examId}/violation`;

    const heartbeatEndpoint = examType === "adaptive"
        ? `/adaptive/${examId}/heartbeat`
        : `/interviews/${examId}/heartbeat`;

    /**
     * Reports an integrity violation to the server.
     */
    const reportViolation = useCallback(async (type, details = "") => {
        if (isCompletedRef.current || autoSubmitted || !examId) return;

        try {
            const res = await api.post(violationEndpoint, {
                type,
                questionIndex: currentQuestionIndex,
                details
            });

            const newCount = res.data.violationCount || (violationCount + 1);
            setViolationCount(newCount);

            if (res.data.autoSubmitted || newCount >= maxViolations) {
                setAutoSubmitted(true);
                setShowWarningModal(false);
                if (onAutoSubmit) {
                    onAutoSubmit("integrity_violation");
                }
            } else {
                setLastViolationMsg(`Integrity Warning: ${details || type}. You must remain in fullscreen throughout the exam.`);
                setShowWarningModal(true);
            }
        } catch (err) {
            console.error("Failed to log violation:", err.message);
        }
    }, [examId, violationEndpoint, currentQuestionIndex, maxViolations, autoSubmitted, violationCount, onAutoSubmit]);

    /**
     * Requests browser fullscreen.
     */
    const enterFullscreen = useCallback(async () => {
        try {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                await elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                await elem.msRequestFullscreen();
            }
            setIsFullscreen(true);
            setShowWarningModal(false);
        } catch (err) {
            console.warn("Fullscreen request error:", err.message);
        }
    }, []);

    // Fullscreen and visibility change listeners
    useEffect(() => {
        if (isCompleted || !isStarted || !examId) return;

        const handleFullscreenChange = () => {
            const inFull = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
            setIsFullscreen(inFull);
            if (!inFull && !isCompletedRef.current) {
                reportViolation("fullscreen_exit", "Exited exam fullscreen window");
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden && !isCompletedRef.current) {
                reportViolation("tab_switch", "Exam tab was hidden or minimized");
            }
        };

        const handleWindowBlur = () => {
            if (!isCompletedRef.current) {
                reportViolation("window_blur", "Exam window lost focus (e.g. app switch / alt-tab)");
            }
        };

        const handleBeforeUnload = (e) => {
            if (!isCompletedRef.current) {
                e.preventDefault();
                e.returnValue = "Leaving this page may abandon your active exam session.";
                return e.returnValue;
            }
        };

        // Block developer shortcuts (F12, Ctrl+Shift+I, Ctrl+U, etc.)
        const handleKeyDown = (e) => {
            if (
                e.key === "F12" ||
                (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")) ||
                (e.ctrlKey && (e.key === "u" || e.key === "U"))
            ) {
                e.preventDefault();
                reportViolation("dev_tools_attempt", `Attempted key combo ${e.key}`);
            }
        };

        // Context menu block
        const handleContextMenu = (e) => {
            e.preventDefault();
            reportViolation("context_menu", "Right click context menu blocked");
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleWindowBlur);
        window.addEventListener("beforeunload", handleBeforeUnload);
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("contextmenu", handleContextMenu);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleWindowBlur);
            window.removeEventListener("beforeunload", handleBeforeUnload);
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("contextmenu", handleContextMenu);
        };
    }, [examId, isCompleted, isStarted, reportViolation]);

    // Heartbeat ping effect
    useEffect(() => {
        if (isCompleted || !isStarted || !examId) return;

        const interval = setInterval(async () => {
            try {
                const res = await api.post(heartbeatEndpoint);
                if (res.data.expired || res.data.alive === false) {
                    if (onAutoSubmit) {
                        onAutoSubmit("time_expired");
                    }
                }
            } catch (err) {
                console.warn("Heartbeat warning:", err.message);
            }
        }, heartbeatIntervalMs);

        return () => clearInterval(interval);
    }, [examId, isCompleted, heartbeatEndpoint, heartbeatIntervalMs, onAutoSubmit]);

    /**
     * Handlers for answer input fields to block paste and record keystrokes.
     */
    const handlePaste = useCallback((e) => {
        e.preventDefault();
        const pastedText = e.clipboardData?.getData("text") || "";
        telemetryRef.current.pasteAttempts += 1;
        reportViolation("paste_attempt", `Paste attempt intercepted (${pastedText.length} chars)`);
    }, [reportViolation]);

    const handleCopyCut = useCallback((e) => {
        telemetryRef.current.copyAttempts += 1;
        reportViolation("copy_cut_attempt", `Copy or cut event detected (${e.type})`);
    }, [reportViolation]);

    const handleInputKeystroke = useCallback((e) => {
        const val = e.target.value || "";
        const curLength = val.length;
        const prevLength = telemetryRef.current.lastTextLength || 0;
        const diff = curLength - prevLength;

        if (!telemetryRef.current.typingStartTime) {
            telemetryRef.current.typingStartTime = Date.now();
        }
        telemetryRef.current.typingDurationMs = Date.now() - telemetryRef.current.typingStartTime;

        if (diff > 0) {
            telemetryRef.current.keystrokesCount += 1;
            telemetryRef.current.totalCharsTyped += diff;
            if (diff > telemetryRef.current.largestInsertLength) {
                telemetryRef.current.largestInsertLength = diff;
            }
        }
        telemetryRef.current.lastTextLength = curLength;
    }, []);

    const resetTelemetry = useCallback(() => {
        telemetryRef.current = {
            pasteAttempts: 0,
            copyAttempts: 0,
            keystrokesCount: 0,
            totalCharsTyped: 0,
            largestInsertLength: 0,
            typingStartTime: null,
            typingDurationMs: 0,
            lastTextLength: 0
        };
    }, []);

    const getTelemetry = useCallback(() => {
        return { ...telemetryRef.current };
    }, []);

    return {
        isFullscreen,
        enterFullscreen,
        violationCount,
        maxViolations,
        showWarningModal,
        setShowWarningModal,
        lastViolationMsg,
        autoSubmitted,
        handlePaste,
        handleCopyCut,
        handleInputKeystroke,
        getTelemetry,
        resetTelemetry
    };
}
