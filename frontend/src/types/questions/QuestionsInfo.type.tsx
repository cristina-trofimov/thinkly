import type { variableTemplate } from "./VariableTemplate.type"

export interface QuestionInfo {
    title: string,
    description: string,
    clarification: string,
    examples: {
        inputs: variableTemplate[],
        outputs: variableTemplate[],
        expectations: string
    }[]
}