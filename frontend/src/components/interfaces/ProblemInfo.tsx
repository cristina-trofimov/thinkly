export interface ProblemInfo {
    title: string,
    problemDesc: string,
    clarification: string,
    examples: {
        inputs: string,
        outputs: string,
        expectations: string
    }
}