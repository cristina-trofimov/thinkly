import type { variableTemplate } from "../VariableTemplate.type"

export type QuestionTemplate = {
    monacoID: string,
    codeBuilder: (problemName: string,
        inputVars: variableTemplate[],
        outputType: string) => string
}