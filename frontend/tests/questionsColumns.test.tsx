import { render, screen } from "@testing-library/react"
import { columns, type Questions } from "../src/components/homepageQuestions/questionsColumns"
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"

// Helper component to test columns
function TestTable({ data }: { data: Questions[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <table>
      <thead>
        <tr>
          {table.getHeaderGroups()[0].headers.map((header) => (
            <th key={header.id}>
              {flexRender(header.column.columnDef.header, header.getContext())}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

describe("Questions Columns", () => {
  const mockData: Questions[] = [
    {
      id: "1",
      questionTitle: "Two Sum",
      date: new Date("2024-01-15"),
      difficulty: "Easy",
    },
    {
      id: "2",
      questionTitle: "Reverse Linked List",
      date: new Date("2024-02-20"),
      difficulty: "Medium",
    },
    {
      id: "3",
      questionTitle: "Merge K Sorted Lists",
      date: new Date("2024-03-10"),
      difficulty: "Hard",
    },
  ]

  test("renders all column headers correctly", () => {
    render(<TestTable data={mockData} />)
    
    expect(screen.getByText("No.")).toBeInTheDocument()
    expect(screen.getByText("Question")).toBeInTheDocument()
    expect(screen.getByText("Date")).toBeInTheDocument()
    expect(screen.getByText("Difficulty")).toBeInTheDocument()
  })

  test("renders question IDs correctly", () => {
    render(<TestTable data={mockData} />)
    
    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  test("renders question titles correctly", () => {
    render(<TestTable data={mockData} />)
    
    expect(screen.getByText("Two Sum")).toBeInTheDocument()
    expect(screen.getByText("Reverse Linked List")).toBeInTheDocument()
    expect(screen.getByText("Merge K Sorted Lists")).toBeInTheDocument()
  })

  test("formats dates correctly using toLocaleDateString", () => {
    render(<TestTable data={mockData} />)
    
    // Dates will be formatted based on user's locale
    const expectedDate1 = new Date("2024-01-15").toLocaleDateString()
    const expectedDate2 = new Date("2024-02-20").toLocaleDateString()
    const expectedDate3 = new Date("2024-03-10").toLocaleDateString()
    
    expect(screen.getByText(expectedDate1)).toBeInTheDocument()
    expect(screen.getByText(expectedDate2)).toBeInTheDocument()
    expect(screen.getByText(expectedDate3)).toBeInTheDocument()
  })

  test("renders difficulty levels correctly", () => {
    render(<TestTable data={mockData} />)
    
    expect(screen.getByText("Easy")).toBeInTheDocument()
    expect(screen.getByText("Medium")).toBeInTheDocument()
    expect(screen.getByText("Hard")).toBeInTheDocument()
  })

  test("has correct number of columns", () => {
    expect(columns).toHaveLength(4)
  })

  test("columns have correct headers", () => {
    expect(columns[0].header).toBe("No.")
    expect(columns[1].header).toBe("Question")
    expect(columns[2].header).toBe("Date")
    expect(columns[3].header).toBe("Difficulty")
  })

  test("date column has custom cell renderer", () => {
    expect(columns[2].cell).toBeDefined()
    expect(typeof columns[2].cell).toBe("function")
  })

  test("renders empty table when data is empty", () => {
    render(<TestTable data={[]} />)
    
    // Headers should still be present
    expect(screen.getByText("No.")).toBeInTheDocument()
    expect(screen.getByText("Question")).toBeInTheDocument()
    expect(screen.getByText("Date")).toBeInTheDocument()
    expect(screen.getByText("Difficulty")).toBeInTheDocument()
  })
})