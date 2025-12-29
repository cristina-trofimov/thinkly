import { CodeMultiLangTemplate } from "./CodeMultiLangTemplate";

export function buildMonacoCode({
    language,
    problemName,
    inputVars,
    outputType,
  }: {
    language: string;
    problemName: string;
    inputVars: { name: string; type: string }[];
    outputType: string;
  }) {
    const template = CodeMultiLangTemplate[language];
    if (!template) {
      throw new Error(`Unsupported language: ${language}`);
    }
  
    return {
      language: template.fileExt,
      filename: template.filename,
      code: template.codeBuilder(problemName, inputVars, outputType),
    };
  }
  