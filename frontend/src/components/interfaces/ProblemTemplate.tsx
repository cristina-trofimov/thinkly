import type { allowedTemplateTypes } from "../helpers/SandpackConfig"
import type { variableTemplate } from "./VariableTemplate"

export type ProblemTemplate = {
    fileExt: string,
    filename: string,
    template: allowedTemplateTypes,
    codeBuilder: (problemName: string,
        inputVars: variableTemplate[],
        outputType: string) => string
}