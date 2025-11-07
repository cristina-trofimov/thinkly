import React from 'react'
import '@testing-library/jest-dom'
import CodingView from '../src/components/codingPage/CodingView'
import { render, screen} from "@testing-library/react"
import userEvent from '@testing-library/user-event'

jest.mock('../src/components/codingPage/CodeDescArea', () => ({
    __esModule: true,
    default: () => <div data-testid="desc-area" />
}))

jest.mock('../src/components/codingPage/CodingArea', () => ({
    __esModule: true,
    default: () => <div data-testid="coding-area" />
}))

jest.mock("../src/components/ui/shadcn-io/sandbox", () => ({
    SandboxProvider: ({ children }: unknown) => <div data-testid="sandbox-provider" >{children}</div>,
    SandboxLayout: ({ children }: unknown) => <div data-testid="sandbox-layout" >{children}</div>,
    SandboxTabs: ({ children }: unknown) => <div data-testid="sandbox-tabs" >{children}</div>,
    SandboxTabsContent: ({ children }: unknown) => <div data-testid="sandbox-tabs-content" >{children}</div>,
    SandboxPreview: () => <div data-testid="sandbox-preview" />,
    SandboxConsole: () => <div data-testid="sandbox-console" />,
}))

jest.mock("../src/components/ui/dropdown-menu", () => ({
    DropdownMenu: ({ children }: unknown) => <div data-testid="languageDropdown" >{children}</div>,
    DropdownMenuTrigger: ({ children, asChild }: unknown) => asChild ? children : <button data-testid="languageBtn">{children}</button>,
    DropdownMenuContent: ({ children }: unknown) => <div data-testid="languageMenu" >{children}</div>,
    DropdownMenuItem: ({ children, ...props }: unknown) => <div data-testid={`languageItem-${children}`} {...props} role='menuitem' >{children}</div>,
}))

jest.mock("../src/components/ui/resizable", () => ({
    ResizablePanelGroup: ({ children }: unknown) => <div data-testid="resizable-group">{children}</div>,
    ResizablePanel: React.forwardRef(({ children }: unknown, ref) => {
      React.useImperativeHandle(ref, () => ({
        resize: jest.fn(), // allow testing of resize() calls
      }));
      return <div data-testid="resizable-panel">{children}</div>;
    }),
    ResizableHandle: () => <div data-testid="resizable-handle" />,
}))

jest.mock("../src/components/helpers/SandpackConfig", () => ({
    getSandpackConfigs: jest.fn(() => ({
      javascript: {
        template: "react",
        files: { "/App.js": "console.log('test');" },
      },
    })),
}))

jest.mock("../src/components/helpers/UseStateCallback", () => ({
    useStateCallback: (initial: unknown) => {
      const [value, setValue] = React.useState(initial)
      return [value, (v: unknown) => setValue(v), jest.fn()]
    },
}))

describe('CodingView Component', () => {
    it('renders and shows key panels (resizable panels and sandbox tabs)', () => {
        render(<CodingView />)
        expect(screen.getAllByTestId("resizable-panel").length).toBe(4)
        expect(screen.getByTestId("sandbox-layout")).toBeInTheDocument()
        expect(screen.getByTestId("sandbox-preview")).toBeInTheDocument()
        expect(screen.getByTestId("sandbox-console")).toBeInTheDocument()
        expect(screen.getByTestId("sandbox-provider")).toBeInTheDocument()
    })

    it('shows dropdown with languages and updates selected language', async () => {
        render(<CodingView />)
        const langBtn = screen.getByTestId('languageBtn')
        expect(langBtn).toBeInTheDocument()

        await userEvent.click(langBtn)
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
        const fullscreenBtn = screen.getByTestId('code-area-collapse')
        expect(screen.getByTestId('code-area-up-btn')).toBeInTheDocument()

        await userEvent.click(fullscreenBtn)
        expect(screen.getByTestId('code-area-down-btn')).toBeInTheDocument()
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
        const fullscreenBtn = screen.getByTestId('output-area-collapse')
        expect(screen.getByTestId('output-area-down-btn')).toBeInTheDocument()

        await userEvent.click(fullscreenBtn)
        expect(screen.getByTestId('output-area-up-btn')).toBeInTheDocument()
    })
})
