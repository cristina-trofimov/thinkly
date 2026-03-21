import type { ColumnDef } from "@tanstack/react-table"
import type { Question } from "../../types/questions/QuestionPagination.type"


const getDiffColor = (d: string) => {
  switch (d.toLowerCase()) {
    case "easy": return "difficulty-easy";
    case "medium": return "difficulty-medium";
    case "hard": return "difficulty-hard";
    default: return "difficulty-unknown";
  }
};

export const columns: ColumnDef<Question>[] = [

  {
    accessorKey: "question_id",
    header: "No.",
  },
  {
    accessorKey: "question_name",
    header: "Question",
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => row.original.last_modified_at.toLocaleDateString(),
  },
  {
    accessorKey: "difficulty",
    header: "Difficulty",
    cell: ({ row }) => {
      const difficulty = row.getValue("difficulty") as string;

      return (
        <span className={`text-[14px] w-fit px-2 py-1 rounded-full ${getDiffColor(difficulty)}`}>
          {difficulty.replace(/^\w/, (c) => c.toUpperCase())}
        </span>
      );
    },
  },
]