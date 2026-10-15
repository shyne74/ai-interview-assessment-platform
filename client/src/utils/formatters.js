/**
 * Client-side Statement Formatter & LaTeX Sanitizer
 * Transforms Codeforces and coding statements into clean, readable text.
 */

export function cleanStatement(rawText) {
    if (!rawText || typeof rawText !== "string") return "";
    let text = rawText;

    // Decode HTML entities
    text = text
        .replace(/&minus;|&#8722;/g, "-")
        .replace(/&ndash;|&#8211;/g, "-")
        .replace(/&mdash;|&#8212;/g, " — ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&nbsp;/g, " ");

    // Normalize weird unicode dashes & quotes
    text = text
        .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-")
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\\text\{---\}|---|--/g, " - ");

    // Common LaTeX mathematical symbols & operations
    text = text
        .replace(/\\le\b|\\leq\b/g, "≤")
        .replace(/\\ge\b|\\geq\b/g, "≥")
        .replace(/\\ne\b|\\neq\b/g, "≠")
        .replace(/\\times\b/g, "×")
        .replace(/\\cdot\b/g, "·")
        .replace(/\\dots\b|\\ldots\b|\\cdots\b/g, "...")
        .replace(/\\oplus\b/g, "⊕")
        .replace(/\\sum\b/g, "∑")
        .replace(/\\prod\b/g, "∏")
        .replace(/\\infty\b/g, "∞")
        .replace(/\\approx\b/g, "≈")
        .replace(/\\pm\b/g, "±")
        .replace(/\\in\b/g, "∈")
        .replace(/\\notin\b/g, "∉")
        .replace(/\\subset\b/g, "⊂")
        .replace(/\\subseteq\b/g, "⊆")
        .replace(/\\cup\b/g, "∪")
        .replace(/\\cap\b/g, "∩")
        .replace(/\\rightarrow\b|\\to\b/g, "→")
        .replace(/\\leftarrow\b/g, "←")
        .replace(/\\bmod\b|\\mod\b/g, " mod ")
        .replace(/\\gcd\b/g, "gcd")
        .replace(/\\min\b/g, "min")
        .replace(/\\max\b/g, "max")
        .replace(/\\log\b/g, "log")
        .replace(/\\ln\b/g, "ln");

    // LaTeX formatting command wrappers
    text = text.replace(/\\sqrt\{([^}]+)\}/g, "√($1)");
    text = text.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1 / $2)");
    text = text.replace(/\\(?:text|mathrm|mathit|mathbf|mathcal|texttt|textbf)\{([^}]+)\}/g, "$1");
    text = text.replace(/\\\{/g, "{").replace(/\\\}/g, "}").replace(/\\\_/g, "_");

    // Strip math delimiters: $$$x$$$, $$x$$, and $x$
    text = text.replace(/\${3}(.*?)\${3}/g, "$1");
    text = text.replace(/\${2}(.*?)\${2}/g, "$1");
    text = text.replace(/\$([^\$\n]+)\$/g, "$1");

    // Superscripts & Subscripts
    text = text.replace(/\^\{([^}]+)\}/g, "^($1)");
    text = text.replace(/_\{([^}]+)\}/g, "[$1]");

    // Strip lone backslashes
    text = text.replace(/\\([a-zA-Z0-9])/g, "$1");

    // Clean whitespace
    text = text
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s*\n\s*\n+/g, "\n\n")
        .trim();

    return text;
}
