import React from 'react'
import '@testing-library/jest-dom'
import CodeDescArea from '../src/components/codingPage/CodeDescArea'
import { render, screen, } from "@testing-library/react"
import { Question } from '../src/types/questions/Question.type'
import { useTestcases } from '../src/components/helpers/useTestcases'
import { getProfile } from '../src/api/AuthAPI'
import { Account } from '../src/types/account/Account.type'
import { MostRecentSub } from '../src/types/MostRecentSub.type'
import { SubmissionType } from '../src/types/SubmissionType.type'
import { getAllSubmissions } from '../src/api/CodeSubmissionAPI'


jest.mock('../src/components/helpers/useTestcases')
jest.mock('../src/lib/axiosClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_URL: 'http://localhost:8000',
}))
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

jest.mock('../src/api/AuthAPI', () => ({
  getProfile: jest.fn()
}))

jest.mock('../src/api/CodeSubmissionAPI', () => ({
  getAllSubmissions: jest.fn()
}))

const user_id = 1
const question_instance_id = 1
const mockProfile: Account = {
  id: 1,
  firstName: "John",
  lastName: "string",
  email: "string@smt.com",
  accountType: "Participant"
}

const mockedGetProfile = getProfile as jest.MockedFunction<typeof getProfile>
const mockedGetAllSubmissions = getAllSubmissions as jest.MockedFunction<typeof getAllSubmissions>

const mockMostRecentSubResponse: MostRecentSub = {
  user_id: user_id,
  question_instance_id: question_instance_id,
  code: "source_code",
  lang_judge_id: 71
}

const mockedSubmissions: SubmissionType[] = [
  {
    user_id: user_id,
    question_instance_id: question_instance_id,
    compile_output: null,
    status: "Accepted",
    runtime: 123,
    memory: 456,
    submitted_on: new Date(2024, 5, 12).toISOString(),
    stdout: null,
    stderr: null,
    message: null,
  }
]

const mockProblem: Question = {
  id: 1,
  title: "Sum Problem",
  description: "Add two numbers",
  media: "string",
  preset_code: "string",
  template_solution: "string",
  difficulty: "Easy",
  date: new Date("2025-10-28T10:00:00Z"),
}

const mockUseTestcases = useTestcases as jest.Mock

const mockTestcases = [
  {
    test_case_id: 1,
    question_id: 1,
    caseID: 'Case 1',
    input_data: {
      num: 10,
      b: 20,
    },
    expected_output: 30,
  },
  {
    test_case_id: 1,
    question_id: 1,
    caseID: 'Case 2',
    input_data: {
      x: 5,
      y: 5,
    },
    expected_output: 25,
  },
]

const nullRef = { current: null }

jest.spyOn(React, 'useRef')
    .mockImplementationOnce(() => nullRef)

const setup = () => {
  const addTestcase = jest.fn()
  const removeTestcase = jest.fn()
  const updateTestcase = jest.fn()
  const setActiveTestcase = jest.fn()

  mockUseTestcases.mockReturnValue({
    testcases: mockTestcases,
    addTestcase,
    removeTestcase,
    updateTestcase,
    loading: false,
    activeTestcase: 'Case 1',
    setActiveTestcase,
  })

  render(<CodeDescArea question={mockProblem} mostRecentSub={mockMostRecentSubResponse} />)

  return {
    addTestcase,
    removeTestcase,
    updateTestcase,
    setActiveTestcase,
  }
}

beforeAll(() => {
  jest.useFakeTimers()
  mockedGetProfile.mockResolvedValue(mockProfile)
  mockedGetAllSubmissions.mockResolvedValue(mockedSubmissions)
  jest.setSystemTime(new Date('2025-10-28T10:00:00Z'))
})

afterAll(() => {
  jest.useRealTimers()
})
describe('CodeDescArea', () => {
  it("renders all tab triggers, the problem details, submissions and leaderboard", () => {
    setup()

    expect(screen.getAllByTestId("tabs-trigger").length).toBe(3)
    expect(screen.getByText("Sum Problem")).toBeInTheDocument()
    expect(screen.getByText("Add two numbers")).toBeInTheDocument()
    expect(screen.getByText(/num = 10/i)).toBeInTheDocument()

    expect(screen.getByText("Status")).toBeInTheDocument()
    expect(screen.getByText("Language")).toBeInTheDocument()
    expect(screen.getByText("Memory")).toBeInTheDocument()
    expect(screen.getByText("Runtime")).toBeInTheDocument()

    expect(screen.getByTestId("mock-current-leaderboard")).toBeInTheDocument()
  })
})
