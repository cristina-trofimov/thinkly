"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { EditableQuestionFields, Question } from "@/types/questions/Question.type";
import ActionsCell from "./QuestionActionsCell";

const difficultyOrder: Record<string, number> = {
  "easy": 1,
  "Easy": 1,
  "medium": 2,
  "Medium": 2,
  "hard": 3,
  "Hard": 3,
}

interface TableMeta {
  handleQuestionUpdate?: (questionId: number, updatedQuestionFields: EditableQuestionFields) => boolean;
  handleQuestionDelete?: (questionId: number) => void;
}

export const columns: ColumnDef<Question>[] = [
  {
    id: "select",
    header: ({ table }) => {
      const isAllSelected = table.getIsAllRowsSelected();
      const isSomeSelected = table.getIsSomeRowsSelected();

      let checkedState: boolean | "indeterminate" = false;

      if (isAllSelected) {
        checkedState = true;
      } else if (isSomeSelected) {
        checkedState = "indeterminate";
      }

      return (
        <Checkbox
          checked={checkedState}
          onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
          aria-label="Select all"
        />
      );
    },
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: "id",
    header: ({ column }) => {
      return (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            ID
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
     cell: ({ row }) => {
      const id: number = row.original.id;

      return (
        <div className="text-center font-medium">
            {id}
        </div>
      );
    }
  },
  {
      accessorKey: "title",
      header: ({ column }) => {
      return (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    
    cell: ({ row }) => {
      const name: string = row.original.title;

      return (
        <div className="text-left font-medium italic">
            {name}
        </div>
      );
    },
  },
  {
    accessorKey: "description",
    header: () => <div className="text-left">Description</div>,
    cell: ({ row }) => (
      <div
        className="max-w-[500px] max-h-[100px] overflow-y-auto whitespace-normal break-words text-left"
        title={row.getValue("description")}
      >{row.getValue("description")}</div>
    ),
  },
  {
    accessorKey: "difficulty",
    header: ({ column }) => {
      return (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Difficulty
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    sortingFn: (rowA, rowB, columnId) => {
      const difficultyA = rowA.getValue<string>(columnId);
      const difficultyB = rowB.getValue<string>(columnId);

      const orderA = difficultyOrder[difficultyA] || Number.POSITIVE_INFINITY;
      const orderB = difficultyOrder[difficultyB] || Number.POSITIVE_INFINITY;

      return orderA - orderB;
    },
    cell: ({ row }) => {
      const difficulty = row.getValue<string>("difficulty");
      const normalizedDifficulty = difficulty.toLowerCase();
      let tagColorClass = "text-muted-foreground";

      if (normalizedDifficulty === "hard") {
        tagColorClass = "text-red-500";
      } else if (normalizedDifficulty === "medium") {
        tagColorClass = "text-yellow-500";
      } else if (normalizedDifficulty === "easy") {
        tagColorClass = "text-green-500";
      }

      return (
        <div className={`flex items-center gap-2 justify-center ${tagColorClass}`} >
          {difficulty.replace(/^\w/, (c) => c.toUpperCase())}
        </div>
      );
    },
  },
  {
      id: "actions",
      cell: ({ row, table }) => {
        const question = row.original;
        const meta = table.options.meta as TableMeta;
        const { handleQuestionDelete } = meta;
  
        return (
          <div className="flex justify-center">
            <ActionsCell question={question} onDelete={handleQuestionDelete} />
          </div>
        );
      },
    },
];