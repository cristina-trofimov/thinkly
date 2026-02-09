"use client";

import React, { type FC } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MoreHorizontal } from "lucide-react";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { updateAccount } from "@/api/AccountsAPI";
import type { EditableQuestionFields, Question } from "@/types/questions/Question.type";

interface ActionsCellProps {
  question: Question;
  onDelete?: (questionId: number) => void;
  onUpdate?: (questionId: number, updatedQuestionFields: EditableQuestionFields) => boolean;
}

interface ActionsCellState {
  isDialogOpen: boolean;
  questionFields?: EditableQuestionFields;
  jsonValue: string;
}

function initState(): ActionsCellState {
  return {
    isDialogOpen: false,
    jsonValue: "",
  };
}

function getQuestionFields(question: Question): EditableQuestionFields {
  return {
    question_name: question.title,
    question_description: question.description,
    media: question.media,
    difficulty: question.difficulty.toLowerCase() as "easy" | "medium" | "hard",
    preset_code: question.preset_code,
    from_string_function: question.from_string_function,
    to_string_function: question.to_string_function,
    template_solution: question.template_solution,
    tags: question.tags,
    testcases: question.testcases,
  };
}

const ActionsCell: FC<ActionsCellProps> = (props) => {
  const [state, setState] = React.useState<ActionsCellState>(initState);
  const { question, onDelete, onUpdate } = props;
  const { isDialogOpen, jsonValue } = state;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() =>
              navigator.clipboard.writeText(question.id.toString())
            }
          >
            Copy question ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              const questionFields = getQuestionFields(question);
              setState((s) => ({
                ...s,
                isDialogOpen: true,
                jsonValue: JSON.stringify(questionFields, null, 2),
              }))
            }}
          >
            Edit question as JSON
          </DropdownMenuItem>
          {/* <DropdownMenuItem onClick={() => onDelete?.(question.id)} className="text-destructive">
            Delete question
          </DropdownMenuItem> */}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={isDialogOpen}
        onOpenChange={() => setState((s) => ({ ...s, isDialogOpen: false }))}
      >
        <DialogContent>
          <FieldSet>
            <FieldLegend className="font-semibold">
              Edit Question as JSON
            </FieldLegend>
            <FieldDescription>
              Make changes to the question here.
            </FieldDescription>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="question_json">Question Data</FieldLabel>
                <Input
                  id="question_json"
                  autoComplete="off"
                  value={jsonValue}
                  onChange={(e) =>
                    setState((s) => ({ ...s, jsonValue: e.target.value }))
                  }
                />
              </Field>
              <Field orientation="horizontal" className="justify-end">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      isDialogOpen: false,
                      jsonValue: "",
                    }))
                  }
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  onClick={() => {
                    const editedQuestionFields = JSON.parse(jsonValue) as EditableQuestionFields;
                    if (onUpdate?.(question.id, editedQuestionFields)) {
                      setState((s) => ({
                        ...s,
                        isDialogOpen: false,
                        jsonValue: ""
                      }));
                    }}
                  }
                >
                  Save Changes
                </Button>
              </Field>
            </FieldGroup>
          </FieldSet>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ActionsCell;