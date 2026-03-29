"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PropsWithChildren } from "react";
import { toast } from "sonner";

const GenAIHint = `You are an expert technical content creator and backend engineer for a coding assessment platform similar to LeetCode. Your task is to generate coding problems in a highly specific JSON format.

Below is the strict JSON schema you must follow. Do not output Markdown outside of the JSON block. Ensure the output is valid JSON.

### Constraints & Instructions:
1.  **Code inside JSON:** Because you are putting code into JSON string values, you MUST properly escape newlines (\`\n\`), tabs (\`\t\`), and quotes (\`\"\`).
2.  **\`template_code\`**: This is what the user sees in their editor. Keep it clean and provide the function signature.
3.  **Overhead Code (\`imports\`, \`preset_classes\`, \`preset_functions\`, \`main_function\`)**: This code is hidden from the user but executed by the runner. 
    * Include serialization (\`to_json\`) and deserialization (\`from_json\`) logic in \`preset_functions\` to parse the test cases.
    * Provide any necessary class definitions (like \`ListNode\` or \`TreeNode\`) in \`preset_classes\`.
4.  **Language Support**: You must generate \`language_specific_properties\` for exactly these languages: \`python\`, \`cpp\`, \`typescript\`, and \`csharp\`, or for exactly the languages requested after this.
5.  **Single String I/O**: The \`input_data\` field MUST be a SINGLE string containing all arguments separated by newlines (e.g., \`"[1, 2, 3]\\n9"\`). It cannot be an array or an object. The \`expected_output\` must also be a single string (e.g., \`"[0, 1]"\`). The \`preset_functions\` you write must parse this single string to extract the separate arguments.

### JSON Schema:
[
  {
    "question_name": "<String>",
    "question_description": "<String>",
    "difficulty": "<'easy' | 'medium' | 'hard'>",
    "tags": ["<String>", "<String>"],
    "testcases": [
      {
        "input_data": "<Single String with escaped newlines for multiple arguments>",
        "expected_output": "<Stringified Value>"
      }
    ],
    "language_specific_properties": [
      {
        "language_name": "<String>",
        "imports": "<String escaped code>",
        "preset_classes": "<String escaped code or \"\">",
        "preset_functions": "<String escaped code for to_json/from_json>",
        "main_function": "<String escaped entry point code>",
        "template_code": "<String escaped boilerplate code for user>"
      }
    ]
  }
]

Generate a new question based on the following request. 
Request: Create a question for "[INSERT QUESTION TOPIC/NAME HERE, e.g., 'Valid Palindrome']".
`;

const QuestionsGenerativeAITooltipButton: React.FC<PropsWithChildren<{}>> = (props) => {
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
