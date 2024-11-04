export function findLCSWordMatches(str1 : string, str2 : string) : Array < {
    start: number,
    end: number
} > {
    const IGNORED_WORDS: string[] = [
        // "import",
        // "static",
        // "async",
        // "await",
        // "return",
        // "const",
        // "let",
        // "var",
        // "function",
        // "class",
        // "interface",
        // "type",
        // "export",
        // "default",
        // "from"
    ] as const;

    // Step 1: Split strings into words and filter ignored words
    const splitToWords = (str : string): string[] => {
        return(str.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || []).filter(word => ! IGNORED_WORDS.includes(word.toLowerCase()) && word.length > 1);

    };

    const words1 = splitToWords(str1);
    const words2 = splitToWords(str2);

    // Convert words to lowercase for case-insensitive comparison
    const words1Lower = words1.map(word => word.toLowerCase());
    const words2Lower = words2.map(word => word.toLowerCase());

    // Step 2: Find the LCS of words1Lower and words2Lower using dynamic programming
    const dp: number[][] = Array(words1Lower.length + 1).fill(null).map(() => Array(words2Lower.length + 1).fill(0));

    for (let i = 1; i <= words1Lower.length; i++) {
        for (let j = 1; j <= words2Lower.length; j++) {
            if (words1Lower[i - 1] === words2Lower[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // Backtrack to find the LCS sequence
    let i = words1Lower.length;
    let j = words2Lower.length;
    const lcsWords: string[] = [];

    while (i > 0 && j > 0) {
        if (words1Lower[i - 1] === words2Lower[j - 1]) { // Use original case from words2
            lcsWords.unshift(words2[j - 1]);
            i--;
            j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
            i--;
        } else {
            j--;
        }
    }

    // Step 3: Map the LCS words back to indices in str2
    const result: Array<{ start: number, end: number }> = [];
    let currentPos = 0;

    for (const word of lcsWords) { // Create a regular expression with word boundaries to find the exact match
        const wordRegex = new RegExp(`\\b${word}\\b`, "i"); // 'i' for case-insensitive match
        const match = wordRegex.exec(str2.slice(currentPos));

        if (match && match.index !== undefined) {
            const startIdx = currentPos + match.index;
            const endIdx = startIdx + word.length;
            result.push({start: startIdx, end: endIdx});
            currentPos = endIdx; // Move current position forward
        }
    }

    return result;
}