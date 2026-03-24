export const getDiffColor = (difficulty: string): string => {
    switch (difficulty.toLowerCase()) {
        case "easy": return "difficulty-easy";
        case "medium": return "difficulty-medium";
        case "hard": return "difficulty-hard";
        default: return "difficulty-unknown";
    }
};