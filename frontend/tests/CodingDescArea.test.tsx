import React from 'react'
import '@testing-library/jest-dom'
import CodeDescArea from '../src/components/codingPage/CodeDescArea'
import { render, screen, fireEvent } from "@testing-library/react"


jest.mock('../src/components/ui/button', () => ({
  __esModule: true,
  Button: ({ children, ...props }: any) => (
      <button {...props} data-testid='button' >{children}</button>
  )
}))

jest.mock("../src/components/ui/tabs", () => ({
  __esModule: true,
  Tabs: ({ children }: any) => <div data-testid="tabs" >{children}</div>,
  TabsList: ({ children }: any) => <div data-testid="tabs-list" >{children}</div>,
  TabsTrigger: ({ children, asChild, ...props }: any) => {
    if (asChild) return React.cloneElement(children, { 'data-testid': 'tabs-trigger', ...props })
    return <button data-testid="tabs-trigger" {...props} >{children}</button>
  },
  TabsContent: ({ value, children }: any) => <div data-testid={`tabs-content-${value}`} >{children}</div>,
}))

jest.mock("../src/components/ui/table", () => ({
  __esModule: true,
  Table: ({ children }: any) => <table data-testid="table" >{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children, ...props }: any) => <td {...props} >{children}</td>,
  TableFooter: ({ children }: any) => <tfoot>{children}</tfoot>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
}))

jest.mock("motion/react", () => {
  const React = require("react")
  const filterProps = (props: any) => {
    const { layout, animate, initial, exit, transition, ...rest } = props
    return rest
  }
  return {
    motion: {
      div: (props: any) => <div {...filterProps(props)}>{props.children}</div>,
      span: (props: any) => <span {...filterProps(props)}>{props.children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  }
})

jest.mock('../src/components/helpers/UseStateCallback', () => ({
    useStateCallback: (initial: any) => {
        const [state, setState] = React.useState(initial)
        return [state, (v: any) => setState(v), jest.fn() ]
    }
}))

jest.mock("../src/components/ui/shadcn-io/code-block", () => ({
  __esModule: true,
  CodeBlock: ({ children }: any) => <div data-testid="code-block" >{children}</div>,
  CodeBlockBody: ({ children }: any) => (
    <div data-testid="code-body" >{
      typeof children === 'function'
      ? children({ language: 'js', code: 'console.log("test")' })
      : children
    }</div>
  ),
  CodeBlockItem: ({ children }: any) => <div data-testid="code-item" >{children}</div>,
  CodeBlockContent: ({ children }: any) => <div data-testid="code-content" >{children}</div>,
}))
jest.mock('../src/components/leaderboards/CurrentLeaderboard.tsx', () => ({
  __esModule: true,
  CurrentLeaderboard: () => <div data-testid="mock-current-leaderboard">Mock Leaderboard</div>
}));

// Samples
const problemInfo = {
  title: "Sum Problem",
  description: "Add two numbers",
  clarification: "njcnsdjnvjsvn",
  examples: [
    {
      inputs: [{ name: "a", type: "int" }, { name: "b", type: "int" }],
      outputs: [{ name: "result", type: "int" }],
      expectations: "Should output sum",
    },
  ],
}


const submissions = [
  {
    status: "Accepted",
    language: "JavaScript",
    memory: "15 MB",
    runtime: "20ms",
    submittedOn: "2025-10-28T10:00:00Z",
  },
]

const leaderboard = [
  { name: "Alice", points: 100, problemsSolved: 2, totalTime: "10m" },
]

beforeAll(() => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date('2025-10-28T10:00:00Z'))
})

afterAll(() => {
  jest.useRealTimers()
})
describe('CodeDescArea', () => {
  it("should render all tab triggers", () => {
    render(<CodeDescArea
      problemInfo={problemInfo}
      submissions={submissions}
    />)

    const triggers = screen.getAllByTestId("tabs-trigger")
    expect(triggers.length).toBe(3)
  })

  it("renders Description tab with problem title and description (by default)", () => {
    render(<CodeDescArea
      problemInfo={problemInfo}
      submissions={submissions}
    />)

    expect(screen.getByText("Sum Problem")).toBeInTheDocument()
    expect(screen.getByText("Add two numbers")).toBeInTheDocument()
    expect(screen.getByText(/Example 1/i)).toBeInTheDocument()
  })

  it("can switch to Submissions tab", () => {
    render(<CodeDescArea
      problemInfo={problemInfo}
      submissions={submissions}
    />)

    const tab = screen.getByText("Submissions")
    fireEvent.click(tab)

    expect(screen.getByText("Accepted")).toBeInTheDocument()
    expect(screen.getByText("JavaScript")).toBeInTheDocument()
  })

  it("clicking a submission opens code view and can go back", () => {
    render(<CodeDescArea
      problemInfo={problemInfo}
      submissions={submissions}
    />)

    fireEvent.click(screen.getByText("Submissions"))
    
    const statusCell = screen.getByText("Accepted")
    fireEvent.click(statusCell)
    expect(screen.getByTestId("code-block")).toBeInTheDocument()

    const backBtn = screen.getByText("Back")
    expect(backBtn).toBeInTheDocument()
    fireEvent.click(backBtn)
    expect(screen.getByText("Accepted")).toBeInTheDocument()
  })

  it("can switch to Leaderboard tab", () => {
  render(<CodeDescArea
    problemInfo={problemInfo}
    submissions={submissions}
  />);

  const tab = screen.getByText("Leaderboard");
  fireEvent.click(tab);

  // Assert the mocked leaderboard is rendered
  expect(screen.getByTestId("mock-current-leaderboard")).toBeInTheDocument();
});

  it('formats submission time properly', () => {
    const times = [
      { ago: 1000, expected: '1 second' },
      { ago: 60000, expected: '1 minute' },
      { ago: 3600000, expected: '1 hour' },
      { ago: 86400000, expected: '1 day' },
    ]

    times.forEach(time => {
      const submission = {
        ...submissions[0],
        submittedOn: new Date(Date.now() - time.ago).toISOString(),
      }

      const { unmount } = render(
        <CodeDescArea
          problemInfo={problemInfo}
          submissions={[submission]}
        />
      )

      fireEvent.click(screen.getByText('Submissions'))

      expect(
        screen.getByText(new RegExp(time.expected, 'i'))
      ).toBeInTheDocument()

      unmount() // Clean up after each iteration
    })
  })
})

