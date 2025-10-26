import type { variableTemplate } from "../interfaces/VariableTemplate";
import { CodeMultiLangTemplate } from "./CodeMultiLangTemplate";

export type allowedTemplateTypes =  "static" | "angular" | "react"
| "react-ts" | "solid" | "svelte" | "test-ts"
| "vanilla" | "vanilla-ts" | "vue" | "vue-ts"
| "node" | "nextjs" | "vite" | "vite-react"
| "vite-react-ts" | "vite-vue" | "vite-vue-ts"
| "vite-svelte" | "vite-svelte-ts" | "astro"

type SandpackConfig = {
    template:  allowedTemplateTypes
    files: Record<string, {code: string}>,
}

export function getSandpackConfigs(
    problemName: string,
    inputVars: variableTemplate[],
    outputType: string
): Partial<Record<string, SandpackConfig>> {
    const configs: Partial<Record<string, SandpackConfig>> = {}

    for (const [lang, config] of Object.entries(CodeMultiLangTemplate)) {
        // const template = CodeMultiLangTemplate[lang]
        const filename = `${problemName}.${config.fileExt}`
        const code = config.codeBuilder(problemName, inputVars, outputType)

        configs[lang] = {
            template: config.template,
            files: {
                [`/${filename}`]: {code}
            }
        }
    }
    return configs
}