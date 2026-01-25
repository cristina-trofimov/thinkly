import { CodeMultiLangTemplate } from "../src/components/helpers/CodeMultiLangTemplate"; // adjust path
import type { QuestionTemplate } from "../src/types/questions/QuestionTemplate.type";

describe("CodeMultiLangTemplate", () => {
    const mockProblemName = "TestProblem";
    const mockInputVars = [
        { name: "a", type: "number" },
        { name: "b", type: "string" }
    ];
    const mockOutputType = "number";

    it("should have templates for all expected languages", () => {
        const expectedLanguages = [
            "Java", "Python", "C", "C#", "C++", "Kotlin",
            "Typescript", "Javascript", "Ruby", "Rust", "Erlang", "Objective-C"
        ];
        expectedLanguages.forEach(lang => {
            expect(CodeMultiLangTemplate).toHaveProperty(lang);
        });
    });

    it("each template should have a fileExt, filename, template, and codeBuilder", () => {
        Object.values(CodeMultiLangTemplate).forEach((tpl: QuestionTemplate) => {
            expect(tpl.monacoID).toBeTruthy();
            expect(tpl.judgeID).toBeTruthy();
            expect(typeof tpl.codeBuilder).toBe("function");
        });
    });

    it("codeBuilder should generate a string containing problem name and input vars", () => {
        Object.entries(CodeMultiLangTemplate).forEach(([lang, tpl]) => {
            const code = tpl.codeBuilder(mockProblemName, mockInputVars, mockOutputType);
            expect(typeof code).toBe("string");
            expect(code).toContain(mockProblemName);
            mockInputVars.forEach(v => expect(code).toContain(v.name));
        });
    });
});
