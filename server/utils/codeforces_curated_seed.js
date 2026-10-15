const Question = require("../models/question_schema");
const { cleanCodeforcesStatement } = require("./statement_cleaner");

const CURATED_CODEFORCES_PROBLEMS = [
    {
        contestId: 4,
        index: "A",
        title: "Watermelon",
        rating: 800,
        difficulty: "easy",
        domain: "Algorithms",
        role: "Coding",
        statement: "One hot summer day Pete and his friend Billy decided to buy a watermelon. They chose the biggest and the ripest one, in their opinion. After that the watermelon was weighed, and the scales showed w kilos. They rushed home, dying of thirst, and decided to divide the berry, however they faced a hard problem.\n\nPete and Billy are great fans of even numbers, that's why they want to divide the watermelon in such a way that each of the two parts weighs even number of kilos, at the same time it is not obligatory that the parts are equal. The boys are extremely tired and want to start their meal as soon as possible, that's why you should help them and find out, if they can divide the watermelon in the way they want. For sure, each of them should get a part of positive weight.\n\nPrint YES, if the boys can divide the watermelon into two parts, each of them weighing even number of kilos; and NO in the opposite case.",
        inputSpec: "The first (and the only) input line contains integer number w (1 ≤ w ≤ 100) — the weight of the watermelon bought by the boys.",
        outputSpec: "Print YES, if the boys can divide the watermelon into two parts, each of them weighing even number of kilos; and NO in the opposite case.",
        samples: [{ input: "8", output: "YES" }, { input: "2", output: "NO" }],
        idealAnswer: "Check if w is even and w > 2. If w > 2 and w % 2 == 0, output YES, otherwise NO.",
        tags: ["math", "brute force"]
    },
    {
        contestId: 71,
        index: "A",
        title: "Way Too Long Words",
        rating: 800,
        difficulty: "easy",
        domain: "Algorithms",
        role: "Coding",
        statement: "Sometimes some words like 'localization' or 'internationalization' are so long that writing them many times in one text is quite tiresome.\n\nLet's consider a word too long, if its length is strictly more than 10 characters. All too long words should be replaced with a special abbreviation.\n\nThis abbreviation is made like this: we write down the first and the last letter of a word and between them we write the number of letters between the first and the last letters. That number is in decimal system and doesn't contain any leading zeroes.\n\nThus, 'localization' will be spelt as 'l10n', and 'internationalization' will be spelt as 'i18n'.\n\nYou are suggested to automatize the process of changing the words with abbreviations. At that all too long words should be replaced by the abbreviation and the words that are not too long should not undergo any changes.",
        inputSpec: "The first line contains an integer n (1 ≤ n ≤ 100). Each of the following n lines contains one word. All the words consist of lowercase Latin letters and possess lengths of from 1 to 100 characters.",
        outputSpec: "Print n lines. The i-th line should contain the result of replacing of the i-th word from the input data.",
        samples: [
            { input: "4\nword\nlocalization\ninternationalization\npneumonoultramicroscopicsilicovolcanoconiosis", output: "word\nl10n\ni18n\np43s" }
        ],
        idealAnswer: "If string length > 10, print s[0] + (len - 2) + s[len - 1]. Otherwise print s unchanged.",
        tags: ["strings"]
    },
    {
        contestId: 231,
        index: "A",
        title: "Team",
        rating: 800,
        difficulty: "easy",
        domain: "Algorithms",
        role: "Coding",
        statement: "One day three best friends Petya, Vasya and Tonya decided to form a team and take part in programming contests. Participants are usually offered several problems during programming contests. Long before the start the friends decided that they will implement a problem if at least two of them are sure about the solution. Otherwise, the friends won't write the problem's solution.\n\nThis contest offers n problems to the participants. For each problem we know, which friend is sure about the solution. Help the friends find the number of problems for which they will write a solution.",
        inputSpec: "The first input line contains a single integer n (1 ≤ n ≤ 1000) — the number of problems in the contest. Then n lines contain three integers each, each integer is either 0 or 1.",
        outputSpec: "Print a single integer — the number of problems the friends will implement on the contest.",
        samples: [{ input: "3\n1 1 0\n1 1 1\n1 0 0", output: "2" }],
        idealAnswer: "For each problem, sum the three votes. If sum >= 2, increment count.",
        tags: ["greedy", "math"]
    },
    {
        contestId: 158,
        index: "A",
        title: "Next Round",
        rating: 800,
        difficulty: "easy",
        domain: "Algorithms",
        role: "Coding",
        statement: "Contestant who earns a score equal to or greater than the k-th place finisher's score will advance to the next round, as long as the contestant earns a positive score... — an excerpt from contest rules.\n\nA total of n participants took part in the contest (n ≥ k), and you already know their scores. Calculate how many participants will advance to the next round.",
        inputSpec: "The first line of the input contains two integers n and k (1 ≤ k ≤ n ≤ 50) separated by a single space. The second line contains n space-separated integers a[1], a[2], ..., a[n] (0 ≤ a[i] ≤ 100), where a[i] is the score earned by the participant who got the i-th place.",
        outputSpec: "Output the number of participants who advance to the next round.",
        samples: [{ input: "8 5\n10 9 8 7 7 7 5 5", output: "6" }],
        idealAnswer: "Find score at index k-1. Count elements that are >= score and > 0.",
        tags: ["special problem", "implementation"]
    },
    {
        contestId: 282,
        index: "A",
        title: "Bit++",
        rating: 800,
        difficulty: "easy",
        domain: "Algorithms",
        role: "Coding",
        statement: "The classic programming language of Bitland is Bit++. A program in Bit++ is a sequence of statements, each of which is one of the following:\n\n- ++X or X++ (increments value of X by 1)\n- --X or X-- (decrements value of X by 1)\n\nInitially, the value of X is 0. Execute the given sequence of n statements and output the final value of X.",
        inputSpec: "The first line contains a single integer n (1 ≤ n ≤ 150) — the number of statements in the program. Next n lines contain one statement each.",
        outputSpec: "Print a single integer — the final value of X.",
        samples: [{ input: "1\n++X", output: "1" }, { input: "2\nX++\n--X", output: "0" }],
        idealAnswer: "Iterate through statements; if '+' is in statement, x++, else x--.",
        tags: ["implementation"]
    },
    {
        contestId: 263,
        index: "A",
        title: "Beautiful Matrix",
        rating: 800,
        difficulty: "easy",
        domain: "Algorithms",
        role: "Coding",
        statement: "You've got a 5 × 5 matrix, consisting of 24 zeroes and a single number one. Let's index the matrix rows by numbers from 1 to 5 from top to bottom, let's index the matrix columns by numbers from 1 to 5 from left to right. In one move, you are allowed to apply one of the two following transformations to the matrix:\n\n1. Swap two neighboring matrix rows.\n2. Swap two neighboring matrix columns.\n\nYou want to find the minimum number of moves needed to make the matrix beautiful, that is, to place the number one at the center (row 3, column 3).",
        inputSpec: "The input consists of 5 lines, each containing 5 integers: the j-th integer in the i-th line of the input represents the element of the matrix that is located on the intersection of the i-th row and the j-th column. Exactly one element equals 1.",
        outputSpec: "Print a single integer — the minimum number of moves needed to make the matrix beautiful.",
        samples: [
            { input: "0 0 0 0 0\n0 0 0 0 1\n0 0 0 0 0\n0 0 0 0 0\n0 0 0 0 0", output: "3" }
        ],
        idealAnswer: "Compute Manhattan distance: abs(row - 2) + abs(col - 2) where 0-indexed coords of 1 are (row, col).",
        tags: ["implementation"]
    },
    {
        contestId: 50,
        index: "A",
        title: "Domino Piling",
        rating: 800,
        difficulty: "easy",
        domain: "Algorithms",
        role: "Coding",
        statement: "You are given a rectangular board of M × N squares. You also have an unlimited number of standard domino pieces of 2 × 1 squares. You are allowed to rotate the pieces. You are asked to place as many dominoes as possible on the board so as to meet the following conditions:\n\n1. Each domino completely covers two squares.\n2. No two dominoes overlap.\n3. Each domino lies entirely inside the board.\n\nFind the maximum number of dominoes which can be placed under these restrictions.",
        inputSpec: "In a single line you are given two integers M and N (1 ≤ M ≤ N ≤ 16).",
        outputSpec: "Output one number — the maximal number of dominoes, which can be put on the board.",
        samples: [{ input: "2 4", output: "4" }, { input: "3 3", output: "4" }],
        idealAnswer: "Return floor((M * N) / 2).",
        tags: ["greedy", "math"]
    },
    {
        contestId: 339,
        index: "A",
        title: "Helpful Maths",
        rating: 800,
        difficulty: "easy",
        domain: "Algorithms",
        role: "Coding",
        statement: "Xenia is a beginner mathematician. She has learned the addition operation. The teacher gave her a sum to calculate. To make the calculation easier, the summands should be arranged in non-decreasing order. For example, '3+2+1' should be rearranged into '1+2+3'.\n\nHelp Xenia rearrange the summands in non-decreasing order.",
        inputSpec: "The first line contains a non-empty string s. Its length doesn't exceed 100 characters. It contains digits '1', '2', '3' and '+' characters.",
        outputSpec: "Print the new sum that Xenia can easily count.",
        samples: [{ input: "3+2+1", output: "1+2+3" }, { input: "1+1+3+1+3", output: "1+1+1+3+3" }],
        idealAnswer: "Split string by '+', sort numbers ascending, and join with '+'.",
        tags: ["greedy", "strings", "sortings"]
    },
    {
        contestId: 118,
        index: "A",
        title: "String Task",
        rating: 1000,
        difficulty: "medium",
        domain: "Algorithms",
        role: "Coding",
        statement: "Petya started to attend programming lessons. On the first lesson his task was to write a simple program. The program was supposed to do the following:\n\n1. Delete all the vowels: 'A', 'O', 'Y', 'E', 'U', 'I'.\n2. Insert a character '.' before each consonant.\n3. Replace all uppercase consonants with corresponding lowercase ones.\n\nHelp Petya implement this program.",
        inputSpec: "The first line represents input string of Petya's program. This string has length from 1 to 100 and consists of uppercase and lowercase Latin letters.",
        outputSpec: "Print the resulting string.",
        samples: [{ input: "tour", output: ".t.r" }, { input: "Codeforces", output: ".c.d.f.r.c.s" }],
        idealAnswer: "Convert to lowercase. Filter out vowels (a, o, y, e, u, i). For each remaining consonant, prepend '.'.",
        tags: ["strings", "implementation"]
    },
    {
        contestId: 1,
        index: "A",
        title: "Theatre Square",
        rating: 1000,
        difficulty: "medium",
        domain: "Algorithms",
        role: "Coding",
        statement: "Theatre Square in the capital city of Berland has a rectangular shape with the size n × m meters. On the occasion of the city's anniversary, a decision was taken to pave the Square with square granite flagstones. Each flagstone is of the size a × a.\n\nWhat is the least number of flagstones needed to pave the Square? It's allowed to cover the surface larger than the Theatre Square, but the Square has to be covered. It's not allowed to break the flagstones. The sides of flagstones should be parallel to the sides of the Square.",
        inputSpec: "The input contains three positive integers: n, m and a (1 ≤ n, m, a ≤ 10^9).",
        outputSpec: "Write the needed number of flagstones.",
        samples: [{ input: "6 6 4", output: "4" }],
        idealAnswer: "Calculate ceil(n / a) * ceil(m / a). Using integer math: ((n + a - 1) / a) * ((m + a - 1) / a).",
        tags: ["math"]
    },
    {
        contestId: 158,
        index: "B",
        title: "Taxi",
        rating: 1100,
        difficulty: "medium",
        domain: "Algorithms",
        role: "Coding",
        statement: "After the championship, n school teams want to take a taxi home. The i-th team has s[i] members (1 ≤ s[i] ≤ 4). Each car can carry at most 4 passengers.\n\nWhat is the minimum number of taxis required to take all children to their destinations, if members of the same team cannot be separated across different taxis?",
        inputSpec: "The first line contains integer n (1 ≤ n ≤ 10^5) — the number of groups of schoolchildren. The second line contains a sequence of integers s[1], s[2], ..., s[n].",
        outputSpec: "Print the single number — the minimum number of taxis necessary to drive all children to Polygon.",
        samples: [{ input: "5\n1 2 4 3 3", output: "4" }],
        idealAnswer: "Greedy matching: Pair size 4 groups with 1 taxi each. Pair size 3 with size 1. Pair size 2 in pairs. Put remaining 1s in taxis.",
        tags: ["greedy", "implementation"]
    },
    {
        contestId: 479,
        index: "A",
        title: "Expression",
        rating: 1000,
        difficulty: "medium",
        domain: "Algorithms",
        role: "Coding",
        statement: "Petya has three integers a, b and c. He can put '+' and '*' operations and brackets between them. He wants to maximize the value of the resulting expression.\n\nFind the maximum value he can obtain from three numbers a, b, c in the given order.",
        inputSpec: "The input consists of three lines, each containing a single integer a, b, and c (1 ≤ a, b, c ≤ 10).",
        outputSpec: "Print the maximum value of the expression.",
        samples: [{ input: "1\n2\n3", output: "9" }, { input: "2\n10\n3", output: "60" }],
        idealAnswer: "Compute max of: a+b+c, a*b*c, (a+b)*c, a*(b+c), a+(b*c), (a*b)+c.",
        tags: ["brute force", "math"]
    },
    {
        contestId: 580,
        index: "A",
        title: "Kefa and First Steps",
        rating: 900,
        difficulty: "easy",
        domain: "Algorithms",
        role: "Coding",
        statement: "Kefa decided to make some money by trading on the stock exchange. He bought n stocks over n days. The price of the stock on the i-th day was a[i].\n\nKefa is interested in the length of the maximum non-decreasing subsegment of the sequence of prices. Help him find this length.",
        inputSpec: "The first line contains integer n (1 ≤ n ≤ 10^5). The second line contains n integers a[1], a[2], ..., a[n] (1 ≤ a[i] ≤ 10^9).",
        outputSpec: "Print a single integer — the length of the maximum non-decreasing subsegment of the sequence.",
        samples: [{ input: "6\n2 2 1 3 4 1", output: "3" }],
        idealAnswer: "Single pass: if a[i] >= a[i-1], currLen++, else currLen = 1. Track maxLen.",
        tags: ["dp", "implementation"]
    },
    {
        contestId: 455,
        index: "A",
        title: "Boredom",
        rating: 1500,
        difficulty: "hard",
        domain: "Algorithms",
        role: "Coding",
        statement: "Alex doesn't like boredom. That's why whenever he gets bored, he plays a game with an array a consisting of n integers.\n\nIn one step Alex can choose some element a[k] and delete it. At the same time, he also deletes all elements equal to a[k] + 1 and all elements equal to a[k] - 1 from the array. This step brings him a[k] points.\n\nAlex wants to maximize the total number of points he earns. Help him find the maximum points.",
        inputSpec: "The first line contains integer n (1 ≤ n ≤ 10^5). The second line contains n integers a[1], a[2], ..., a[n] (1 ≤ a[i] ≤ 10^5).",
        outputSpec: "Print a single integer — the maximum number of points that Alex can earn.",
        samples: [{ input: "2\n1 2", output: "2" }, { input: "9\n1 2 1 3 2 2 2 2 3", output: "10" }],
        idealAnswer: "Count frequencies of each number. DP state: dp[i] = max(dp[i-1], dp[i-2] + count[i] * i).",
        tags: ["dp"]
    },
    {
        contestId: 545,
        index: "C",
        title: "Woodcutters",
        rating: 1500,
        difficulty: "hard",
        domain: "Algorithms",
        role: "Coding",
        statement: "Little Vasya is playing a new game. In this game there are n trees located along a straight road at coordinates x[1], x[2], ..., x[n]. The height of the i-th tree is h[i].\n\nVasya can fell each tree either to the left, to the right, or leave it standing. A felled tree takes up an interval of length h[i] along the road. No two felled trees or standing trees may occupy the same coordinate.\n\nVasya wants to fell the maximum number of trees. Find this maximum number.",
        inputSpec: "The first line contains a single integer n (1 ≤ n ≤ 10^5). Each of the next n lines contains two integers x[i] and h[i] (1 ≤ x[i], h[i] ≤ 10^9).",
        outputSpec: "Print a single integer — the maximum number of trees that can be felled.",
        samples: [
            { input: "5\n1 2\n2 1\n5 10\n10 9\n19 1", output: "3" }
        ],
        idealAnswer: "Greedy choice: Always fell left if space permits; otherwise fell right if space permits. Track last occupied coordinate.",
        tags: ["dp", "greedy"]
    },
    {
        contestId: 706,
        index: "B",
        title: "Interesting Drink",
        rating: 1100,
        difficulty: "medium",
        domain: "Algorithms",
        role: "Coding",
        statement: "Vasiliy likes to rest in a cafe. The city has n shops selling his favorite drink 'Beecola'. The price of the drink in the i-th shop is x[i] coins.\n\nVasiliy plans to buy the drink for q consecutive days. On the i-th day he has m[i] coins. He wants to know how many shops he will be able to buy a drink from on each day.",
        inputSpec: "The first line contains integer n (1 ≤ n ≤ 10^5). The second line contains n integers x[1], x[2], ..., x[n]. The third line contains integer q (1 ≤ q ≤ 10^5). Then q lines follow, each with integer m[i].",
        outputSpec: "Print q integers. The i-th integer should equal the number of shops where Vasiliy can buy a drink on the i-th day.",
        samples: [
            { input: "5\n3 10 8 6 11\n4\n1\n10\n3\n11", output: "0\n4\n1\n5" }
        ],
        idealAnswer: "Sort array of prices. For each query, use binary search (upper_bound / bisect_right) to find count of shops with price <= m[i].",
        tags: ["binary search", "dp", "implementation"]
    },
    {
        contestId: 1328,
        index: "A",
        title: "Divisibility Problem",
        rating: 800,
        difficulty: "easy",
        domain: "Algorithms",
        role: "Coding",
        statement: "You are given two positive integers a and b. In one move you can increase a by 1 (that is, make a = a + 1). Find the minimum number of moves you need to do in order to make a divisible by b.",
        inputSpec: "The first line contains integer t (1 ≤ t ≤ 10^4) — number of test cases. Each test case consists of two integers a and b (1 ≤ a, b ≤ 10^9).",
        outputSpec: "For each testcase, print the minimum number of moves.",
        samples: [{ input: "5\n10 4\n13 9\n100 13\n123 456\n92 46", output: "2\n5\n4\n333\n0" }],
        idealAnswer: "If a % b == 0, moves = 0. Otherwise moves = b - (a % b).",
        tags: ["math"]
    },
    {
        contestId: 996,
        index: "A",
        title: "Hit the Lottery",
        rating: 800,
        difficulty: "easy",
        domain: "Algorithms",
        role: "Coding",
        statement: "Allen has a LOT of money from the lottery. He has n dollars in the bank. For security reasons, he wants to withdraw all his cash in the minimum number of bills possible. The available bill denominations are 1, 5, 10, 20, and 100 dollars.\n\nWhat is the minimum number of bills Allen could receive after withdrawing his entire balance?",
        inputSpec: "The input consists of a single line containing an integer n (1 ≤ n ≤ 10^9).",
        outputSpec: "Print the minimum number of bills that Allen could receive.",
        samples: [{ input: "125", output: "3" }, { input: "43", output: "5" }],
        idealAnswer: "Greedy division by [100, 20, 10, 5, 1]. Sum the quotients and reduce remainder.",
        tags: ["greedy", "dp"]
    },
    {
        contestId: 200,
        index: "B",
        title: "Drinks",
        rating: 800,
        difficulty: "easy",
        domain: "Algorithms",
        role: "Coding",
        statement: "Little Vasya loves orange juice very much. Vasya has n different drinks in his fridge. The fraction of orange juice in the i-th drink is p[i] percent. Vasya decided to make a cocktail by mixing equal proportions of each of the n drinks.\n\nFind the volume fraction of orange juice in the cocktail in percent.",
        inputSpec: "The first line contains integer n (1 ≤ n ≤ 100). The second line contains n integers p[1], p[2], ..., p[n] (0 ≤ p[i] ≤ 100).",
        outputSpec: "Print the volume fraction of orange juice in percent. The answer is considered correct if absolute or relative error does not exceed 10^-4.",
        samples: [{ input: "3\n50 50 100", output: "66.666666666667" }],
        idealAnswer: "Compute sum(p) / n as a floating point number.",
        tags: ["math", "implementation"]
    },
    {
        contestId: 4,
        index: "C",
        title: "Registration System",
        rating: 1300,
        difficulty: "medium",
        domain: "Algorithms",
        role: "Coding",
        statement: "A new e-mail service 'Berland Mail' is starting its work in Berland. The site wants to register users quickly. When a user requests a username, if the name is not yet taken, the system responds with 'OK'. If the name already exists in the database, the system appends the smallest positive integer i (starting at 1) to make the name unique (e.g. 'name1', 'name2') and outputs the new username.\n\nSimulate the registration system.",
        inputSpec: "The first line contains number n (1 ≤ n ≤ 10^5). The following n lines contain requests to the system.",
        outputSpec: "Print n lines with the responses of the system.",
        samples: [
            { input: "4\nabacaba\naba\nabacaba\nuser", output: "OK\nOK\nabacaba1\nOK" }
        ],
        idealAnswer: "Use a hash map to store frequencies of usernames. If name not in map, print OK and map[name] = 1. Else print name + map[name] and map[name]++.",
        tags: ["data structures", "hashing"]
    }
];

async function seedCuratedCodeforces(userId = null, targetRole = "Coding") {
    let insertedCount = 0;
    for (const p of CURATED_CODEFORCES_PROBLEMS) {
        const existing = await Question.findOne({
            "codingData.contestId": p.contestId,
            "codingData.index": p.index
        });

        if (!existing) {
            const cleanText = cleanCodeforcesStatement(p.statement);
            const cleanInput = cleanCodeforcesStatement(p.inputSpec);
            const cleanOutput = cleanCodeforcesStatement(p.outputSpec);

            await Question.create({
                questionText: cleanText,
                role: targetRole || p.role || "Coding",
                domain: p.domain || "Algorithms",
                difficulty: p.difficulty || "easy",
                type: "coding",
                assessmentType: "coding",
                idealAnswer: p.idealAnswer,
                keypoint: p.tags || [],
                maxscore: p.difficulty === "hard" ? 15 : p.difficulty === "medium" ? 12 : 10,
                timeLimit: 180,
                isAIGenerated: false,
                status: "approved",
                createdBy: userId,
                codingData: {
                    contestId: p.contestId,
                    index: p.index,
                    problemUrl: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
                    inputSpecification: cleanInput,
                    outputSpecification: cleanOutput,
                    samples: p.samples || [],
                    timeLimit: 2000,
                    memoryLimit: 256
                }
            });
            insertedCount++;
        }
    }
    return {
        totalCurated: CURATED_CODEFORCES_PROBLEMS.length,
        insertedCount: insertedCount
    };
}

module.exports = {
    CURATED_CODEFORCES_PROBLEMS,
    seedCuratedCodeforces
};
