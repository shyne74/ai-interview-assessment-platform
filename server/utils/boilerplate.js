/**
 * Starter boilerplates for supported coding languages.
 */
const LANGUAGE_BOILERPLATES = {
    javascript: `// JavaScript (Node.js) - Standard I/O
const fs = require('fs');

function solve() {
    // Read all input tokens from standard input
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length === 0 || input[0] === '') return;

    // TODO: Parse input tokens and implement solution
    // Example: const n = parseInt(input[0], 10);

    // Print your result to standard output
}

solve();
`,
    python: `# Python 3 - Standard I/O
import sys

def solve():
    # Read all input tokens from standard input
    input_data = sys.stdin.read().split()
    if not input_data:
        return

    # TODO: Parse input tokens and implement solution
    # Example: n = int(input_data[0])

    # Print your result to standard output
    pass

if __name__ == '__main__':
    solve()
`,
    cpp: `// C++ (GCC) - Fast I/O
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

int main() {
    // Fast I/O operations
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // TODO: Read input from cin and implement solution
    // Example: int n; if (cin >> n) { ... }

    // Print your result to cout

    return 0;
}
`,
    java: `// Java (OpenJDK) - Main class for Judge0
import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        // TODO: Read input using scanner and implement solution
        // Example: if (scanner.hasNextInt()) { int n = scanner.nextInt(); }

        // Print your result to standard output
    }
}
`
};

/**
 * Normalizes code by replacing Windows line endings (\r\n -> \n)
 * and stripping extra whitespace.
 */
function normalizeCode(code) {
    if (!code || typeof code !== "string") return "";
    return code
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .trim();
}

function stripCommentsAndWhitespace(code = '') {
    if (!code || typeof code !== 'string') return '';
    return code
        .replace(/\/\*[\s\S]*?\*\//g, '') // C-style block comments
        .replace(/\/\/.*/g, '')           // C-style line comments
        .replace(/#.*/g, '')             // Python-style line comments
        .replace(/\s+/g, '')             // All whitespace
        .trim();
}

/**
 * Returns true if code is empty or identical to the starter boilerplate
 * for the given language.
 */
function isTemplateOrEmpty(code, language = "javascript") {
    const normalized = normalizeCode(code);
    if (!normalized) return true;

    // Check specific language template
    const langKey = (language || "javascript").toLowerCase();
    const template = LANGUAGE_BOILERPLATES[langKey];
    if (template && normalizeCode(template) === normalized) {
        return true;
    }

    // Also check stripped comments & whitespace
    const strippedCandidate = stripCommentsAndWhitespace(code);
    if (template && strippedCandidate === stripCommentsAndWhitespace(template)) {
        return true;
    }

    // Also check all other language templates in case language wasn't matched
    for (const key of Object.keys(LANGUAGE_BOILERPLATES)) {
        if (normalizeCode(LANGUAGE_BOILERPLATES[key]) === normalized) {
            return true;
        }
        if (strippedCandidate === stripCommentsAndWhitespace(LANGUAGE_BOILERPLATES[key])) {
            return true;
        }
    }

    // If python with just `pass` or empty solve function
    if (langKey === 'python' && (strippedCandidate === 'importsysdefsolve():passif__name__==\'__main__\':solve()' || strippedCandidate === 'defsolve():pass')) {
        return true;
    }

    return false;
}

module.exports = {
    LANGUAGE_BOILERPLATES,
    normalizeCode,
    stripCommentsAndWhitespace,
    isTemplateOrEmpty
};
