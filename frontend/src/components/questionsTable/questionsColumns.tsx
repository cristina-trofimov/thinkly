import type { ColumnDef } from "@tanstack/react-table"
import type { Question } from "../../types/questions/Question.type"
   
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
      },
  ]