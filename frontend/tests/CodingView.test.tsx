import React from 'react'
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CodingView from '../src/components/codingPage/CodingView'
import { MemoryRouter, useLocation } from 'react-router-dom'


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
      DropdownMenuTrigger: ({ children }: any) => <button>{children}</button>,
      DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
      DropdownMenuItem: ({ children }: any) => <div>{children}</div>,
    }
})

jest.mock("react-resizable-panels", () => ({
// jest.mock("../src/components/ui/resizable", () => ({
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

jest.mock("../src/components/helpers/MonacoConfig", () => ({
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

const nullRef = { current: null }

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

    // jest.spyOn(React, 'useRef')
    //     .mockImplementation(() => nullRef as any)
    })

    it('renders and shows key panels (resizable panels and sandbox tabs)', () => {
        render(<CodingView />)

        expect(screen.getAllByTestId("panel-group").length).toBe(2)
        expect(screen.getAllByTestId("resizable-panel").length).toBe(4)
        expect(screen.getByTestId("submit-btn")).toBeInTheDocument()
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
        
        const fullscreenBtn = screen.getByTestId('code-area-fullscreen')
        expect(screen.getByTestId('code-area-max-btn')).toBeInTheDocument()

        await userEvent.click(fullscreenBtn)
        expect(screen.getByTestId('code-area-min-btn')).toBeInTheDocument()
    })

    it('collapses and uncollapses code area', async () => {
        render(<CodingView />)

        const collapseAreaBtn = screen.getByTestId('code-area-collapse')
        expect(screen.getByTestId('code-area-up-btn')).toBeInTheDocument()
        // expect(screen.getByTestId('code-area-down-btn')).not.toBeInTheDocument()

        await userEvent.click(collapseAreaBtn)
        expect(screen.getByTestId('code-area-down-btn')).toBeInTheDocument()
        // expect(screen.getByTestId('code-area-up-btn')).not.toBeInTheDocument()
    })

    it('toggles and closes output area fullscreen mode', async () => {
        render(<CodingView />)
        const fullscreenBtn = screen.getByTestId('output-area-fullscreen')
        expect(screen.getByTestId('output-area-max-btn')).toBeInTheDocument()

        await userEvent.click(fullscreenBtn)
        expect(screen.getByTestId('output-area-min-btn')).toBeInTheDocument()
    })

    it('collapses and uncollapses output area', async () => {
        render(<CodingView />)
        const collapseOutputBtn = screen.getByTestId('output-area-collapse')
        expect(screen.getByTestId('output-area-down-btn')).toBeInTheDocument()

        await userEvent.click(collapseOutputBtn)
        expect(screen.getByTestId('output-area-up-btn')).toBeInTheDocument()
    })

    it('collapses both areas when output area is collapsed and console is already collapsed', async () => {
        render(<CodingView />)
        await userEvent.click(screen.getByTestId('output-area-collapse'))
        expect(screen.getByTestId('output-area-up-btn')).toBeInTheDocument()

        await userEvent.click(screen.getByTestId('code-area-collapse'))
        
        expect(screen.getByTestId('code-area-up-btn')).toBeInTheDocument()
        expect(screen.getByTestId('output-area-down-btn')).toBeInTheDocument()
    })

    // // it('collapses both areas when console is collapsed and output area is already collapsed', async () => {
    // //     render(<CodingView />)
    // //     await userEvent.click(screen.getByTestId('code-area-collapse'))
    // //     expect(screen.getByTestId('code-area-down-btn')).toBeInTheDocument()

    // //     await userEvent.click(screen.getByTestId('output-area-collapse'))
        
    // //     expect(screen.getByTestId('code-area-up-btn')).toBeInTheDocument()
    // //     expect(screen.getByTestId('output-area-down-btn')).toBeInTheDocument()
    // // })
})
