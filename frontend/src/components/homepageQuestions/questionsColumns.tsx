import type { ColumnDef } from "@tanstack/react-table"

export type Questions = {
    id: string
    questionTitle: string
    date: Date
    difficulty: "Easy"|"Medium"|"Hard"
  }
   
  export const columns: ColumnDef<Questions>[] = [
    {
        accessorKey: "id",
        header: "No.",
      },
      {
        accessorKey: "questionTitle",
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