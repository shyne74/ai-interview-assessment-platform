const mongoose = require('mongoose');
require('dotenv').config();
const Question = require('../models/question_schema');
const { cleanStatement } = require('../utils/statement_cleaner');

const CURATED_RECURSION_BACKTRACKING_PROBLEMS = [
    {
        questionText: "Given an integer n, return all distinct solutions to the n-queens puzzle. The n-queens puzzle is the problem of placing n queens on an n×n chessboard such that no two queens attack each other. Each solution contains a distinct board configuration of the n-queens' placement, where 'Q' and '.' both indicate a queen and an empty space, respectively.",
        role: "Coding",
        domain: "Recursion & Backtracking",
        difficulty: "hard",
        type: "coding",
        assessmentType: "coding",
        timeLimit: 300,
        maxscore: 10,
        status: "approved",
        codingData: {
            contestId: 9001,
            index: "A",
            title: "N-Queens Puzzle",
            rating: 1800,
            inputSpecification: "The input contains a single integer n (1 ≤ n ≤ 9) representing the board dimension.",
            outputSpecification: "Return or print each distinct board configuration separated by newlines, with each row on its own line.",
            samples: [
                {
                    input: "4",
                    output: "[[\".Q..\",\"...Q\",\"Q...\",\"..Q.\"],[\"..Q.\",\"Q...\",\"...Q\",\".Q..\"]]"
                },
                {
                    input: "1",
                    output: "[[\"Q\"]]"
                }
            ],
            tags: ["backtracking", "recursion", "dfs"]
        },
        idealAnswer: "Use backtracking to place queens row by row. Maintain state for occupied columns, main diagonals (row - col), and anti-diagonals (row + col). When row == n, record the board snapshot. Backtrack by resetting column and diagonal markers. Time complexity is O(N!), Space complexity is O(N) auxiliary space.",
        keypoint: ["Backtracking", "State maintenance", "Diagonal hashing (row - col, row + col)", "Base case"]
    },
    {
        questionText: "Given an array of distinct integers candidates and a target integer target, return a list of all unique combinations of candidates where the chosen numbers sum to target. The same number may be chosen from candidates an unlimited number of times. Two combinations are unique if the frequency of at least one of the chosen numbers is different.",
        role: "Coding",
        domain: "Recursion & Backtracking",
        difficulty: "medium",
        type: "coding",
        assessmentType: "coding",
        timeLimit: 240,
        maxscore: 10,
        status: "approved",
        codingData: {
            contestId: 9001,
            index: "B",
            title: "Combination Sum",
            rating: 1400,
            inputSpecification: "The first line contains integer target (1 ≤ target ≤ 500). The second line contains space-separated distinct integers candidates (1 ≤ candidates[i] ≤ 200).",
            outputSpecification: "Print all unique combinations that sum up to target.",
            samples: [
                {
                    input: "7\n2 3 6 7",
                    output: "[[2,2,3],[7]]"
                },
                {
                    input: "8\n2 3 5",
                    output: "[[2,2,2,2],[2,3,3],[3,5]]"
                }
            ],
            tags: ["backtracking", "recursion", "dfs"]
        },
        idealAnswer: "Sort candidates. Use recursive backtracking with parameters (index, currentSum, currentCombination). If currentSum == target, append copy of currentCombination. If currentSum > target or index >= len, return. Branch 1: include candidates[index] and recurse with same index (unlimited reuse). Branch 2: skip candidates[index] and increment index.",
        keypoint: ["Recursive branching", "Combination tree", "Pruning when sum > target", "Index advancement"]
    },
    {
        questionText: "Given an m x n grid of characters board and a string word, return true if word exists in the grid. The word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.",
        role: "Coding",
        domain: "Recursion & Backtracking",
        difficulty: "medium",
        type: "coding",
        assessmentType: "coding",
        timeLimit: 240,
        maxscore: 10,
        status: "approved",
        codingData: {
            contestId: 9001,
            index: "C",
            title: "Word Search in Grid",
            rating: 1500,
            inputSpecification: "The first line contains grid dimensions m and n (1 ≤ m, n ≤ 6). The next m lines contain n characters each. The final line contains target string word (1 ≤ len ≤ 15).",
            outputSpecification: "Print 'true' if the word exists in the board, otherwise 'false'.",
            samples: [
                {
                    input: "3 4\nA B C E\nS F C S\nA D E E\nABCCED",
                    output: "true"
                },
                {
                    input: "3 4\nA B C E\nS F C S\nA D E E\nABCB",
                    output: "false"
                }
            ],
            tags: ["backtracking", "recursion", "dfs", "matrix"]
        },
        idealAnswer: "Iterate through each cell (r, c). If board[r][c] == word[0], start DFS(r, c, 0). In DFS: if index == len(word), return true. If out of bounds or board[r][c] != word[index], return false. Temporarily mark board[r][c] as visited (e.g. '#'), recursively check 4 directions (r+1, r-1, c+1, c-1), and restore original character on backtrack. Return boolean result.",
        keypoint: ["Matrix DFS", "Backtracking state restoration", "Boundary checking", "Visited marking without extra space"]
    },
    {
        questionText: "Given an integer n, generate all combinations of well-formed parentheses containing n pairs of opening and closing parentheses '(' and ')'.",
        role: "Coding",
        domain: "Recursion & Backtracking",
        difficulty: "medium",
        type: "coding",
        assessmentType: "coding",
        timeLimit: 180,
        maxscore: 10,
        status: "approved",
        codingData: {
            contestId: 9001,
            index: "D",
            title: "Generate Parentheses",
            rating: 1300,
            inputSpecification: "A single integer n (1 ≤ n ≤ 8).",
            outputSpecification: "List of all valid well-formed parentheses strings of length 2n.",
            samples: [
                {
                    input: "3",
                    output: "[\"((()))\",\"(()())\",\"(())()\",\"()(())\",\"()()()\"]"
                },
                {
                    input: "1",
                    output: "[\"()\"]"
                }
            ],
            tags: ["recursion", "backtracking", "strings"]
        },
        idealAnswer: "Use backtracking with counters for open and close parentheses. Base case: if current length == 2*n, add current string to result. Recursive rule: can add '(' if openCount < n. Can add ')' if closeCount < openCount. Time complexity is Catalan number Cn * n, space complexity is O(n).",
        keypoint: ["Backtracking with constraints", "Catalan number", "Valid prefix invariant", "Base case"]
    },
    {
        questionText: "Given a collection of numbers, nums, that might contain duplicates, return all possible unique permutations in any order. Each permutation must be unique and utilize all elements.",
        role: "Coding",
        domain: "Recursion & Backtracking",
        difficulty: "medium",
        type: "coding",
        assessmentType: "coding",
        timeLimit: 240,
        maxscore: 10,
        status: "approved",
        codingData: {
            contestId: 9001,
            index: "E",
            title: "Permutations with Duplicates",
            rating: 1400,
            inputSpecification: "First line contains n (1 ≤ n ≤ 8). Second line contains n space-separated integers.",
            outputSpecification: "Print all unique permutations.",
            samples: [
                {
                    input: "3\n1 1 2",
                    output: "[[1,1,2],[1,2,1],[2,1,1]]"
                }
            ],
            tags: ["recursion", "backtracking", "permutations"]
        },
        idealAnswer: "Sort nums to group duplicates. Use a boolean visited array. In backtracking function: loop from 0 to n-1. If visited[i], continue. If i > 0 and nums[i] == nums[i-1] and !visited[i-1], continue to skip duplicate branches. Mark visited[i]=true, push to path, recurse, then unmark and pop.",
        keypoint: ["Duplicate pruning", "Sorting for deduplication", "Visited array", "State restoration"]
    },
    {
        questionText: "Given a string s, partition s such that every substring of the partition is a palindrome. Return all possible palindrome partitioning of s.",
        role: "Coding",
        domain: "Recursion & Backtracking",
        difficulty: "hard",
        type: "coding",
        assessmentType: "coding",
        timeLimit: 300,
        maxscore: 10,
        status: "approved",
        codingData: {
            contestId: 9001,
            index: "F",
            title: "Palindrome Partitioning",
            rating: 1600,
            inputSpecification: "A single line containing string s (1 ≤ len(s) ≤ 16) consisting of lowercase English letters.",
            outputSpecification: "Return all palindrome partitioning lists.",
            samples: [
                {
                    input: "aab",
                    output: "[[\"a\",\"a\",\"b\"],[\"aa\",\"b\"]]"
                },
                {
                    input: "a",
                    output: "[[\"a\"]]"
                }
            ],
            tags: ["recursion", "backtracking", "strings", "dp"]
        },
        idealAnswer: "Use backtracking starting at index 0. For each end from start to len(s)-1: check if s[start...end] is a palindrome. If yes, add substring to current path and recurse with start = end + 1. If start == len(s), add path to results. Can precompute palindrome table with 2D DP for O(1) checks.",
        keypoint: ["Backtracking partition", "Palindrome verification", "Recursive exploration", "Base case"]
    }
];

async function run() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    // 1. Clean existing duplicates
    const allQuestions = await Question.find({});
    console.log(`Total questions before deduplication: ${allQuestions.length}`);

    const seenTextMap = new Map();
    let deletedCount = 0;

    for (const q of allQuestions) {
        const norm = (q.questionText || "").trim().toLowerCase().replace(/\s+/g, " ");
        if (!norm) continue;

        if (seenTextMap.has(norm)) {
            // Duplicate found: Keep the one with richer codingData or approved status
            const existing = seenTextMap.get(norm);
            const existingHasCoding = Boolean(existing.codingData?.samples?.length);
            const currentHasCoding = Boolean(q.codingData?.samples?.length);

            if (!existingHasCoding && currentHasCoding) {
                // Delete existing, keep current
                await Question.deleteOne({ _id: existing._id });
                seenTextMap.set(norm, q);
                deletedCount++;
            } else {
                // Delete current
                await Question.deleteOne({ _id: q._id });
                deletedCount++;
            }
        } else {
            seenTextMap.set(norm, q);
        }
    }

    console.log(`Deduplication complete. Removed ${deletedCount} duplicate question documents.`);

    // 2. Seed Recursion & Backtracking curated questions
    let insertedCurated = 0;
    for (const p of CURATED_RECURSION_BACKTRACKING_PROBLEMS) {
        const norm = p.questionText.trim().toLowerCase().replace(/\s+/g, " ");
        if (!seenTextMap.has(norm)) {
            await Question.create(p);
            seenTextMap.set(norm, p);
            insertedCurated++;
        }
    }

    console.log(`Seeded ${insertedCurated} curated Recursion & Backtracking coding problems.`);
    const finalCount = await Question.countDocuments();
    console.log(`Total questions in database now: ${finalCount}`);
    process.exit(0);
}

run().catch(err => {
    console.error("Migration error:", err);
    process.exit(1);
});
