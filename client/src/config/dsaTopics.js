export const DSA_TOPICS = [
    {
        slug: "arrays",
        label: "Arrays",
        description: "Master contiguous memory, multi-dimensional grids, prefix sums, and element manipulation.",
        cfTags: ["data structures"],
        keywords: ["array", "subarray", "elements", "matrix", "vector", "indices", "multiset"]
    },
    {
        slug: "strings",
        label: "Strings",
        description: "Explore string matching, substrings, palindromes, and character frequency transformations.",
        cfTags: ["strings"],
        keywords: ["string", "substring", "palindrome", "character", "prefix", "suffix"]
    },
    {
        slug: "hash-maps",
        label: "Hash Maps",
        description: "Constant-time lookups, frequency counters, anagram grouping, and key-value mapping.",
        cfTags: ["data structures"],
        keywords: ["hash map", "hash table", "hashmap", "dictionary", "hash set", "hashset", "frequency"]
    },
    {
        slug: "two-pointers",
        label: "Two Pointers",
        description: "Efficiently shrink search spaces with convergent or parallel pointer strategies.",
        cfTags: ["two-pointer technique", "two pointers"],
        keywords: ["two pointer", "two pointers", "left right", "pointers"]
    },
    {
        slug: "sliding-window",
        label: "Sliding Window",
        description: "Track optimal sub-arrays or sub-strings dynamically in linear time.",
        cfTags: ["sliding window"],
        keywords: ["sliding window", "window", "consecutive"]
    },
    {
        slug: "linked-lists",
        label: "Linked Lists",
        description: "Pointer-based sequence management, list reversals, cycle detection, and merge routines.",
        cfTags: ["data structures"],
        keywords: ["linked list", "singly linked", "doubly linked", "head node"]
    },
    {
        slug: "stacks-queues",
        label: "Stacks & Queues",
        description: "LIFO and FIFO ordering, monotonic stack patterns, and expression evaluation.",
        cfTags: ["data structures"],
        keywords: ["stack", "queue", "deque", "lifo", "fifo", "parentheses", "bracket"]
    },
    {
        slug: "binary-search",
        label: "Binary Search",
        description: "Logarithmic search on monotonic functions, search-in-rotated arrays, and bisection.",
        cfTags: ["binary search"],
        keywords: ["binary search", "bisection", "lower_bound", "upper_bound"]
    },
    {
        slug: "sorting",
        label: "Sorting",
        description: "Custom comparators, merge/quick sort paradigms, order statistics, and inversions.",
        cfTags: ["sortings", "sorting"],
        keywords: ["sort", "sorting", "sorted", "bubble sort", "merge sort", "quick sort", "comparator", "inversion"]
    },
    {
        slug: "recursion",
        label: "Recursion",
        description: "Base cases, call stack unwinding, divide-and-conquer, and problem decomposition.",
        cfTags: ["recursion", "divide and conquer"],
        keywords: ["recursion", "recursive", "base case", "divide and conquer"]
    },
    {
        slug: "trees",
        label: "Trees",
        description: "Binary tree traversals, tree diameters, LCA queries, and hierarchical modeling.",
        cfTags: ["trees"],
        keywords: ["tree", "rooted tree", "binary tree", "ancestor", "leaf", "subtree"]
    },
    {
        slug: "binary-search-trees",
        label: "Binary Search Trees",
        description: "Inorder properties, self-balancing BST concepts, validation, and range queries.",
        cfTags: ["trees", "data structures"],
        keywords: ["binary search tree", "bst", "inorder"]
    },
    {
        slug: "heaps",
        label: "Heaps",
        description: "Priority queues, top-K element extraction, median tracking, and heap sort.",
        cfTags: ["data structures"],
        keywords: ["heap", "priority queue", "min-heap", "max-heap"]
    },
    {
        slug: "graphs",
        label: "Graphs",
        description: "DFS/BFS traversals, cycle detection, topological sort, Dijkstra, and connected components.",
        cfTags: ["graphs", "dfs and similar", "shortest paths"],
        keywords: ["graph", "vertex", "vertices", "edge", "edges", "dfs", "bfs", "directed", "cycle", "shortest path"]
    },
    {
        slug: "backtracking",
        label: "Backtracking",
        description: "Systematic state exploration, permutations, combinations, and constraint satisfaction.",
        cfTags: ["brute force", "backtracking"],
        keywords: ["backtracking", "permutations", "combinations", "n-queens", "sudoku"]
    },
    {
        slug: "greedy",
        label: "Greedy",
        description: "Locally optimal choices that lead to globally optimal solutions.",
        cfTags: ["greedy"],
        keywords: ["greedy", "optimal", "minimum operations", "maximum"]
    },
    {
        slug: "dynamic-programming",
        label: "Dynamic Programming",
        description: "Optimal substructure, overlapping subproblems, memoization, and tabulations.",
        cfTags: ["dp", "dynamic programming"],
        keywords: ["dynamic programming", "dp", "memoization", "knapsack", "subsequence"]
    },
    {
        slug: "tries",
        label: "Tries",
        description: "Prefix tree data structures for fast dictionary retrieval and auto-complete.",
        cfTags: ["trees", "strings", "data structures"],
        keywords: ["trie", "prefix tree", "prefix search"]
    },
    {
        slug: "bit-manipulation",
        label: "Bit Manipulation",
        description: "Bitwise XOR, AND, OR operations, bitmasks, bit shifts, and two's complement.",
        cfTags: ["bitmasks"],
        keywords: ["bitwise", "xor", "bitmask", "binary representation", "bit shift"]
    },
    {
        slug: "math",
        label: "Math",
        description: "Number theory, modular arithmetic, prime factorizations, and combinatorics.",
        cfTags: ["math", "number theory"],
        keywords: ["math", "integer", "modulo", "prime", "gcd", "lcm", "combinatorics", "divisible"]
    }
];

export function getTopicBySlug(slug) {
    if (!slug) return null;
    const clean = slug.trim().toLowerCase();
    return DSA_TOPICS.find(t => t.slug === clean) || null;
}

export function getTopicByLabel(label) {
    if (!label) return null;
    const clean = label.trim().toLowerCase();
    return DSA_TOPICS.find(t => 
        t.label.toLowerCase() === clean || 
        t.slug === clean || 
        t.slug.replace(/-/g, " ") === clean
    ) || null;
}

export function getAllTopics() {
    return DSA_TOPICS;
}
