import { render, screen, fireEvent } from '@testing-library/react';
import { SelectionCard } from '../src/components/createActivity/SelectionCard';

// Mock the DnD context since it's complex to test actual drag interaction in RTL
jest.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: any) => <div>{children}</div>,
  Droppable: ({ children }: any) => children({
    draggableProps: {},
    innerRef: jest.fn(),
    placeholder: <div data-testid="placeholder" />
  }, {}),
  Draggable: ({ children }: any) => children({
    draggableProps: {},
    dragHandleProps: {},
    innerRef: jest.fn(),
  }, { isDragging: false }),
}));

describe('SelectionCard', () => {
  interface MockItem { id: number; title: string; }
  
  const availableItems: MockItem[] = [{ id: 1, title: 'Question A' }, { id: 2, title: 'Question B' }];
  const orderedItems: MockItem[] = [{ id: 3, title: 'Selected Q' }];

  const mockProps = {
    title: "Question Selection",
    description: "Select and order questions.",
    searchPlaceholder: "Search questions...",
    searchQuery: "",
    onSearchChange: jest.fn(),
    availableItems,
    orderedItems,
    onAdd: jest.fn(),
    onRemove: jest.fn(),
    onMove: jest.fn(),
    onDragEnd: jest.fn(),
    renderItemTitle: (item: MockItem) => item.title,
    droppableIdPrefix: "test",
    onClearAll: jest.fn(),
    onSelectAll: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  describe('Rendering & Content', () => {
    test('renders title, description, and item counts', () => {
      render(<SelectionCard {...mockProps} />);
      
      expect(screen.getByText("Question Selection")).toBeInTheDocument();
      
      // FIX 1: Use a more specific selector for the count. 
      // "1" appears as both the total count and the index of the first item.
      const selectedCount = screen.getByText("1", { selector: '.text-2xl' });
      expect(selectedCount).toBeInTheDocument();
      expect(selectedCount).toHaveClass('text-primary');

      expect(screen.getByText("Question A")).toBeInTheDocument();
    });

    test('applies error styling when isInvalid is true', () => {
      render(<SelectionCard {...mockProps} isInvalid={true} />);
      
      // FIX 2: Instead of container.firstChild (which might be the DnD provider),
      // query the card directly via its title or a test ID.
      const card = screen.getByText("Question Selection").closest('.bg-card');
      expect(card).toHaveClass('border-destructive');
    });
  });

  describe('User Interactions', () => {
    test('calls onSearchChange when typing in search bar', () => {
      render(<SelectionCard {...mockProps} />);
      const input = screen.getByPlaceholderText("Search questions...");
      
      fireEvent.change(input, { target: { value: 'React' } });
      expect(mockProps.onSearchChange).toHaveBeenCalledWith('React');
    });

    test('calls onAdd when clicking the plus button on an available item', () => {
      render(<SelectionCard {...mockProps} />);
      // Find the button within the "Available" section (first item)
      const addButtons = screen.getAllByRole('button');
      const addBtn = addButtons.find(btn => btn.querySelector('.lucide-plus'));
      
      if (addBtn) fireEvent.click(addBtn);
      expect(mockProps.onAdd).toHaveBeenCalledWith(availableItems[0]);
    });

    test('calls onMove with correct direction when clicking arrows', () => {
      // Setup with at least 2 items to ensure buttons aren't disabled
      const multiOrdered = [...orderedItems, { id: 4, title: 'Item 2' }];
      render(<SelectionCard {...mockProps} orderedItems={multiOrdered} />);
      
      const downButtons = screen.getAllByRole('button').filter(btn => btn.querySelector('.lucide-arrow-down'));
      fireEvent.click(downButtons[0]);
      
      expect(mockProps.onMove).toHaveBeenCalledWith(0, 'down');
    });

    test('calls onSelectAll and onClearAll callbacks', () => {
      render(<SelectionCard {...mockProps} />);
      
      // Use exact strings or more specific queries.
      const selectAllBtn = screen.getByRole('button', { name: /^select all$/i });
      fireEvent.click(selectAllBtn);
      expect(mockProps.onSelectAll).toHaveBeenCalled();

      const clearAllBtn = screen.getByRole('button', { name: /deselect all/i });
      fireEvent.click(clearAllBtn);
      expect(mockProps.onClearAll).toHaveBeenCalled();
    });
  });
});