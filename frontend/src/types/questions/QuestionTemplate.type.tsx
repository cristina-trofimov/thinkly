import type { allowedTemplateTypes } from "../../components/helpers/SandpackConfig"
import type { variableTemplate } from "../VariableTemplate.type"

export type QuestionTemplate = {
    fileExt: string,
    filename: string,
    template: allowedTemplateTypes,
    codeBuilder: (problemName: string,
        inputVars: variableTemplate[],
        outputType: string) => string
}