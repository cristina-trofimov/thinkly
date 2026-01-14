import type { variableTemplate } from "../VariableTemplate.type"

export type QuestionTemplate = {
    monacoID: string,
    judgeID: string,
    codeBuilder: (problemName: string,
        inputVars: variableTemplate[],
        outputType: string) => string
}