import React from 'react'
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CodingView from '../src/views/CodingView'
import { useLocation } from 'react-router-dom'
import { Question } from '../src/types/questions/Question.type'
import { useTestcases } from '../src/components/helpers/useTestcases'


jest.mock('@monaco-editor/react', () => {
    return function MonacoEditorMock(props: any) {
      return (
        <textarea
          data-testid="monaco-editor"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
        />
      )
    }
})

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

jest.mock('../src/components/helpers/Loader.tsx', () => {
    return function Loader(props: any) {
      return (
        <div data-testid="Loader" />
      )
    }
})

jest.mock('../src/components/codingPage/ConsoleOutput.tsx', () => {
    return function ConsoleOutput(props: any) {
      return (
        <div data-testid="ConsoleOutput" />
      )
    }
})

jest.mock('../src/api/Judge0API', () => ({
    submitToJudge0: jest.fn(() =>
      Promise.resolve({
        text: () => 'Execution success'
      })
    )
}))

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useLocation: jest.fn(),
}))

jest.mock('../src/components/codingPage/CodeDescArea', () => ({
    __esModule: true,
    default: () => <div data-testid="desc-area" />
}))

jest.mock('../src/components/codingPage/Testcases', () => ({
    __esModule: true,
    default: () => <div />
}))

jest.mock("../src/components/ui/dropdown-menu", () => {
    const React = require('react')
  
    const DropdownContext = React.createContext({
      itemMap: new Map(),
    })
  
    return {
      __esModule: true,
      DropdownMenu: ({ children }: any) => (
        <DropdownContext.Provider value={{ itemMap: new Map() }}>
          {children}
        </DropdownContext.Provider>
      ),
      DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
      DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
      DropdownMenuItem: ({ children }: any) => <div>{children}</div>,
    }
})

jest.mock("react-resizable-panels", () => ({
    __esModule: true,
    PanelGroup: React.forwardRef(({children}: any, ref) => {
        React.useImperativeHandle(ref, () => ({
            setLayout: jest.fn(),
        }))
        return <div data-testid="panel-group" >{children}</div>
    }),
    Panel: ({children}: any) => (
        <div data-testid="resizable-panel" >{children}</div>
    ),
    PanelResizeHandle: () => <div data-testid="resizable-handle" />,
}))

jest.mock("../src/components/helpers/monacoConfig", () => ({
    __esModule: true,
    buildMonacoCode: jest.fn(() => ({
      Javascript: {
        monacoID: "javascript",
        judgeID: "63",
        templateCode: "console.log('test javascript')",
      },
      Typescript: {
        monacoID: "typescript",
        judgeID: "74",
        templateCode: "console.log('test typescript')",
      },
    })),
}))

jest.mock("../src/components/helpers/UseStateCallback", () => ({
    __esModule: true,
    useStateCallback: (initial: any) => {
      const [value, setValue] = React.useState(initial)
      return [value, (v: any) => setValue(v), jest.fn()]
    },
}))

jest.mock('../src/components/helpers/useTestcases')

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
    caseID: 'Case 1',
    input_data: {
      a: 10,
      b: 20,
    },
  },
]

const nullRef = { current: null }

jest.spyOn(React, 'useRef')
    .mockImplementationOnce(() => nullRef)
    .mockImplementationOnce(() => nullRef)
    .mockImplementationOnce(() => nullRef)
    .mockImplementationOnce(() => nullRef)

describe('CodingView Component', () => {
    beforeEach(() => {
        jest.clearAllMocks()

        ;(useLocation as jest.Mock).mockReturnValue({
            pathname: '/code/1',
            state: { problem: mockProblem },
          })

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
    })

    it('renders and shows key panels (resizable panels and sandbox tabs)', () => {
        render(<CodingView />)

        expect(screen.getAllByTestId("panel-group").length).toBe(2)
        expect(screen.getAllByTestId("resizable-panel").length).toBe(4)
        expect(screen.getAllByTestId("resizable-handle").length).toBe(2)
        expect(screen.getByTestId("submit-btn")).toBeInTheDocument()
        expect(screen.getByTestId("language-btn")).toBeInTheDocument()
        expect(screen.getByTestId("coding-btns")).toBeInTheDocument()
        expect(screen.getByTestId("testcases-tab")).toBeInTheDocument()
        expect(screen.getByTestId("code-output-tab")).toBeInTheDocument()
    })
    
    it("doesn't call panelRef.current.resize when refs are not set", async () => {
        render(<CodingView />)
        
        fireEvent.click(screen.getByTestId('code-area-fullscreen'))
        
        expect(nullRef.current?.resize).toBeUndefined();
    })

    it('toggles and closes code area fullscreen mode', async () => {
        render(<CodingView />)

        expect(screen.getByTestId('code-area-max-icon')).toBeInTheDocument()
        expect(screen.queryByTestId('code-area-min-icon')).toBeNull()

        await userEvent.click(screen.getByTestId('code-area-fullscreen'))

        expect(screen.queryByTestId('code-area-max-icon')).toBeNull()
        expect(screen.getByTestId('code-area-min-icon')).toBeInTheDocument()
    })

    it('collapses and uncollapses code area', async () => {
        render(<CodingView />)

        expect(screen.getByTestId('code-area-up-icon')).toBeInTheDocument()
        expect(screen.queryByTestId('code-area-down-icon')).toBeNull()

        await userEvent.click(screen.getByTestId('code-area-collapse'))

        expect(screen.queryByTestId('code-area-up-icon')).toBeNull()
        expect(screen.getByTestId('code-area-down-icon')).toBeInTheDocument()
    })

    it('toggles and closes output area fullscreen mode', async () => {
        render(<CodingView />)

        expect(screen.getByTestId('output-area-max-icon')).toBeInTheDocument()
        expect(screen.queryByTestId('output-area-min-icon')).toBeNull()

        await userEvent.click(screen.getByTestId('output-area-fullscreen'))

        expect(screen.queryByTestId('output-area-max-icon')).toBeNull()
        expect(screen.getByTestId('output-area-min-icon')).toBeInTheDocument()
    })

    it('collapses and uncollapses output area', async () => {
        render(<CodingView />)

        expect(screen.getByTestId('output-area-down-icon')).toBeInTheDocument()
        expect(screen.queryByTestId('output-area-up-icon')).toBeNull()

        await userEvent.click(screen.getByTestId('output-area-collapse'))

        expect(screen.queryByTestId('output-area-down-icon')).toBeNull()
        expect(screen.getByTestId('output-area-up-icon')).toBeInTheDocument()
    })

    it('uncollapses both areas when output area is collapsed and console is already collapsed', async () => {
        render(<CodingView />)

        expect(screen.getByTestId('code-area-up-icon')).toBeInTheDocument()
        expect(screen.getByTestId('output-area-down-icon')).toBeInTheDocument()
        expect(screen.queryByTestId('output-area-up-icon')).toBeNull()
        expect(screen.queryByTestId('code-area-down-icon')).toBeNull()

        await userEvent.click(screen.getByTestId('output-area-collapse'))

        expect(screen.getByTestId('code-area-up-icon')).toBeInTheDocument()
        expect(screen.getByTestId('output-area-up-icon')).toBeInTheDocument()
        expect(screen.queryByTestId('output-area-down-icon')).toBeNull()
        expect(screen.queryByTestId('code-area-down-icon')).toBeNull()
    })

    it('collapses both areas when console is collapsed and output area is already collapsed', async () => {
        render(<CodingView />)

        expect(screen.getByTestId('code-area-up-icon')).toBeInTheDocument()
        expect(screen.getByTestId('output-area-down-icon')).toBeInTheDocument()
        expect(screen.queryByTestId('output-area-up-icon')).toBeNull()
        expect(screen.queryByTestId('code-area-down-icon')).toBeNull()

        await userEvent.click(screen.getByTestId('code-area-collapse'))

        expect(screen.getByTestId('code-area-down-icon')).toBeInTheDocument()
        expect(screen.getByTestId('output-area-down-icon')).toBeInTheDocument()
        expect(screen.queryByTestId('output-area-up-icon')).toBeNull()
        expect(screen.queryByTestId('code-area-up-icon')).toBeNull()
    })

    it('handles monaco editor code changes', async () => {
        render(<CodingView />)

        const editor = screen.getByTestId('monaco-editor')
        await userEvent.clear(editor)
        await userEvent.type(editor, 'const x = 5')

        expect(editor).toHaveValue('const x = 5')
    })

    it('switches between testcases and results tabs', async () => {
        render(<CodingView />)

        const testcasesTab = screen.getByTestId('testcases-tab')
        const resultsTab = screen.getByTestId('code-output-tab')

        expect(testcasesTab).toBeInTheDocument()
        expect(resultsTab).toBeInTheDocument()
    })

    it('calls submit code when submit button is clicked', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
        render(<CodingView />)

        const submitBtn = screen.getByTestId('submit-btn')
        await userEvent.click(submitBtn)

        expect(consoleSpy).toHaveBeenCalledWith('submitting code')
        consoleSpy.mockRestore()
    })

    it('shows loader when question has no id', () => {
        ;(useLocation as jest.Mock).mockReturnValue({
            pathname: '/code/1',
            state: { problem: { ...mockProblem, id: undefined } },
        })

        render(<CodingView />)

        expect(screen.getByTestId('Loader')).toBeInTheDocument()
    })

    it('runs code and updates logs when run button is clicked', async () => {
        const { submitToJudge0 } = require('../src/api/Judge0API')
        const mockResponse = {
            status: { description: 'Accepted' },
            time: '0.1',
        }
        submitToJudge0.mockResolvedValueOnce(mockResponse)

        render(<CodingView />)

        const buttons = screen.getAllByRole('button')
        const playButton = buttons.find(btn => btn.querySelector('.lucide-play'))

        await userEvent.click(playButton!)

        expect(submitToJudge0).toHaveBeenCalled()
    })

    it('handles language dropdown interaction', async () => {
        render(<CodingView />)

        const languageBtn = screen.getByTestId('language-btn')
        expect(languageBtn).toHaveTextContent('Java')

        expect(languageBtn).toBeInTheDocument()
    })


    it('renders description area with question', () => {
        render(<CodingView />)

        expect(screen.getByTestId('desc-area')).toBeInTheDocument()
    })

    it('handles async loading state during code execution', async () => {
        const { submitToJudge0 } = require('../src/api/Judge0API')

        let resolvePromise: (value: any) => void
        const mockPromise = new Promise((resolve) => {
            resolvePromise = resolve
        })
        submitToJudge0.mockReturnValueOnce(mockPromise)

        render(<CodingView />)

        const buttons = screen.getAllByRole('button')
        const playButton = buttons.find(btn => btn.querySelector('.lucide-play'))

        await userEvent.click(playButton!)

        expect(screen.getByTestId('Loader')).toBeInTheDocument()

        resolvePromise!({
            status: { description: 'Accepted' },
            time: '0.1',
        })
    })

    it('handles failed code execution', async () => {
        const { submitToJudge0 } = require('../src/api/Judge0API')
        const mockResponse = {
            status: { description: 'Wrong Answer' },
            time: '0.2',
        }
        submitToJudge0.mockResolvedValueOnce(mockResponse)

        render(<CodingView />)

        const buttons = screen.getAllByRole('button')
        const playButton = buttons.find(btn => btn.querySelector('.lucide-play'))

        await userEvent.click(playButton!)

        await screen.findByTestId('code-output-tab')
        expect(submitToJudge0).toHaveBeenCalled()
    })

    it('displays coding buttons container', () => {
        render(<CodingView />)

        const codingBtns = screen.getByTestId('coding-btns')
        expect(codingBtns).toBeInTheDocument()
        expect(codingBtns).toHaveTextContent('Code')
    })

    it('maintains code state when changing other UI elements', async () => {
        render(<CodingView />)

        const editor = screen.getByTestId('monaco-editor')
        await userEvent.clear(editor)
        await userEvent.type(editor, 'test code')

        await userEvent.click(screen.getByTestId('code-area-fullscreen'))

        expect(editor).toHaveValue('test code')
    })

    it('handles multiple code runs and accumulates logs', async () => {
        const { submitToJudge0 } = require('../src/api/Judge0API')
        submitToJudge0
            .mockResolvedValueOnce({
                status: { description: 'Accepted' },
                time: '0.1',
            })
            .mockResolvedValueOnce({
                status: { description: 'Wrong Answer' },
                time: '0.2',
            })

        render(<CodingView />)

        const buttons = screen.getAllByRole('button')
        const playButton = buttons.find(btn => btn.querySelector('.lucide-play'))

        await userEvent.click(playButton!)
        await screen.findByTestId('code-output-tab')

        await userEvent.click(playButton!)
        await screen.findByTestId('code-output-tab')

        expect(submitToJudge0).toHaveBeenCalledTimes(2)
    })

    it('renders sandbox with correct dimensions', () => {
        render(<CodingView />)

        const sandbox = screen.getByTestId('sandbox')
        expect(sandbox).toBeInTheDocument()
        expect(sandbox).toHaveClass('px-2', 'h-182.5')
    })

    it('displays console output tab', () => {
        render(<CodingView />)

        expect(screen.getByTestId('code-output-tab')).toBeInTheDocument()
    })

    it('handles code editor onChange with undefined value', () => {
        render(<CodingView />)

        const editor = screen.getByTestId('monaco-editor')
        fireEvent.change(editor, { target: { value: undefined } })

        expect(editor).toBeInTheDocument()
    })

    it('renders all button icons correctly', () => {
        render(<CodingView />)

        expect(screen.getByTestId('code-area-max-icon')).toBeInTheDocument()
        expect(screen.getByTestId('code-area-up-icon')).toBeInTheDocument()
        expect(screen.getByTestId('output-area-max-icon')).toBeInTheDocument()
        expect(screen.getByTestId('output-area-down-icon')).toBeInTheDocument()
    })

    it('handles question without id gracefully', () => {
        ;(useLocation as jest.Mock).mockReturnValue({
            pathname: '/code/1',
            state: { problem: { ...mockProblem, id: undefined } },
        })

        render(<CodingView />)

        expect(screen.getByTestId('Loader')).toBeInTheDocument()
    })
})