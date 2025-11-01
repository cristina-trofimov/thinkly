import type { variableTemplate } from "./VariableTemplate"

export interface ProblemInfo {
    title: string,
    description: string,
    clarification: string,
    examples: {
        inputs: variableTemplate[],
        outputs: variableTemplate[],
        expectations: string
    }[]
}