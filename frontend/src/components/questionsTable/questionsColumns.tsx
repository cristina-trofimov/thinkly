import type { ColumnDef } from "@tanstack/react-table"
import type { Question } from "../../types/questions/Question.type"
   
  export const columns: ColumnDef<Question>[] = [
    {
        accessorKey: "id",
        header: "No.",
      },
      {
        accessorKey: "title",
        header: "Question",
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => row.original.date.toLocaleDateString(),
      },
      {
        accessorKey: "difficulty",
        header: "Difficulty",
      },
  ]