"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PropsWithChildren } from "react";
import { toast } from "sonner";

const GenAIHint = `You are generating coding question data for a coding platform.

Your output must be STRICTLY VALID JSON and must ALWAYS be formatted as a JSON ARRAY, even if there is only one question.

Return ONLY the JSON.
Do not use markdown.
Do not use code fences.
Do not add comments.
Do not add explanations.
Do not add any text before or after the JSON.

Required top-level output shape:
[
{
"question_name": "...",
"question_description": "...",
"media": null,
"difficulty": "easy|medium|hard",
"language_specific_properties": [
{
"language_name": "Python",
"imports": "...",
"preset_classes": "...",
"preset_functions": "...",
"main_function": "...",
"template_code": "..."
},
{
"language_name": "JavaScript",
"imports": "...",
"preset_classes": "...",
"preset_functions": "...",
"main_function": "...",
"template_code": "..."
},
{
"language_name": "C++",
"imports": "...",
"preset_classes": "...",
"preset_functions": "...",
"main_function": "...",
"template_code": "..."
},
{
"language_name": "Java",
"imports": "...",
"preset_classes": "...",
"preset_functions": "...",
"main_function": "...",
"template_code": "..."
}
],
"tags": ["...", "..."],
"testcases": [
{
"input_data": ...,
"expected_output": ...
}
]
}
]

Rules:

* Output must be valid JSON that can be parsed directly with JSON.parse.
* The OUTERMOST structure must always be a JSON array.
* Never output a bare JSON object, even for a single question.
* Do not include any text outside the JSON array.
* Use double quotes for all keys and all string values.
* Escape all inner double quotes inside string values as \\t.
* Escape backslashes correctly.
* Escape newlines inside code strings as \\n.
* Do not include trailing commas.
* Do not include extra keys.
* "media" must always be null.
* Each question must include at least 1 testcase.
* Each question must contain exactly 4 languages and in this exact order:

  1. Python
  2. JavaScript
  3. C++
  4. Java
* Use the same problem and same function purpose across all languages for each question.
* The function name must stay logically consistent across all 4 languages for each question.
* C++ and Java starter code must use class Solution.
* template_code must contain starter code only, never the full solution.
* main_function must read stdin, parse input, call the required function, and print output.
* preset_functions must contain any parsing and serialization helpers needed.
* testcases must exactly match the problem statement and function behavior.
* The generated content must be upload-ready with no manual fixes needed.

Critical formatting requirements:

* question_description must be a valid JSON string.
* Do not put unescaped double quotes inside question_description.
* Prefer avoiding quoted phrases inside question_description unless absolutely necessary.
* Every code field must remain a single JSON string value, even if it contains multiple lines.
* Do not output placeholder text like "..." in the final answer.
* Do not wrap the JSON in quotes.
* Do not stringify the whole array as a string.

Function consistency requirements:

* Input parsing must match the testcase input format exactly.
* Output serialization must match the expected_output format exactly.
* If expected_output is an array or object, serialize as valid JSON.
* If expected_output is a string, print it as a JSON string.
* If expected_output is a number or boolean, print it in valid JSON-compatible form.

Platform implementation conventions:

* Python:

  * Use imports such as import sys, import json, and typing imports when needed.
  * Put JSON parsing helpers in preset_functions.
  * main_function must read all stdin using sys.stdin.read().strip().
* JavaScript:

  * Use const fs = require("fs"); in imports.
  * main_function must read stdin with fs.readFileSync(0, "utf8").trim().
* C++:

  * Use class Solution.
  * Do NOT use external JSON libraries such as nlohmann/json.hpp.
  * Do NOT assume any third-party headers are installed.
  * Only use the C++ standard library.
  * preset_functions must manually parse the expected stdin format using standard library code only.
  * main_function must read all stdin into a string, parse it, instantiate Solution, call the function, and print the serialized result.
* Java:

  * Use class Solution for the user function.
  * Put runner code in main_function with public class Main.
  * Do NOT use external libraries such as com.fasterxml.jackson.databind.ObjectMapper or Gson.
  * Do NOT assume any third-party packages are installed.
  * Only use the Java standard library.
  * preset_functions must manually parse the expected stdin format using standard library code only.
  * Read stdin fully before parsing.

Important compatibility rule:

* The generated C++ and Java code must compile in a minimal environment with standard library support only.
* Never import or reference third-party JSON parsers in C++ or Java.
* If the testcase input is simple, such as an array of integers, strings, booleans, numbers, or basic nested arrays, write manual parsing helpers using only standard library features.
* Prefer problems whose input can be parsed reliably without external libraries.
* The runner code must be consistent with the declared testcase format.

Before answering, silently validate ALL of the following:

1. The final output is a JSON array, not a single object.
2. The JSON parses successfully with JSON.parse.
3. All string escaping is correct.
4. No trailing commas exist.
5. All required keys exist and no extra keys exist.
6. Every question has exactly 4 language entries.
7. The language order is exactly Python, JavaScript, C++, Java.
8. C++ and Java use class Solution.
9. template_code is starter code only.
10. testcases match the problem exactly.
11. The output can be sent directly to an API expecting a list body.
12. question_description does not contain unescaped quotes.
13. C++ does not use nlohmann/json.hpp or any non-standard header.
14. Java does not use ObjectMapper, Gson, or any external package.
15. C++ and Java parsing logic uses only the standard library.
16. main_function, preset_functions, and template_code are mutually consistent in every language.

Final instruction:
Generate a DOWNLOADABLE JSON file.
`;

const QuestionsGenerativeAITooltipButton: React.FC<PropsWithChildren<Record<string, never>>> = (props) => {
  const handleCopyHello = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(GenAIHint);
      toast.success('Copied GenAI Hint to clipboard.');
    } catch (error) {
      console.error("Failed to copy text to clipboard:", error);
      toast.error("Failed to copy text to clipboard.");
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          onClick={() => {
            void handleCopyHello();
          }}
        >
          {props.children || "Copy GenAI Hint"}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Copy Generative AI Hint for Question JSON Structure</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default QuestionsGenerativeAITooltipButton;
