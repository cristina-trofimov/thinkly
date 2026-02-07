import { render, screen, fireEvent } from '@testing-library/react';
import { GameplayLogicCard } from '../src/components/createActivity/GameplayLogicCard'; // Adjust path as needed

describe('GameplayLogicCard', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders with initial cooldown values', () => {
      render(
        <GameplayLogicCard 
          questionCooldown="300" 
          riddleCooldown="60" 
          onChange={mockOnChange} 
        />
      );

      expect(screen.getByLabelText(/Question Cooldown/i)).toHaveValue(300);
      expect(screen.getByLabelText(/Riddle Cooldown/i)).toHaveValue(60);
      expect(screen.getByText('Gameplay Logic')).toBeInTheDocument();
    });
  });

  describe('Input Logic & numeric handling', () => {
    test('calls onChange with clean numeric value for question cooldown', () => {
      render(
        <GameplayLogicCard 
          questionCooldown="300" 
          riddleCooldown="60" 
          onChange={mockOnChange} 
        />
      );

      const qInput = screen.getByLabelText(/Question Cooldown/i);
      
      // Test standard change
      fireEvent.change(qInput, { target: { value: '450' } });
      expect(mockOnChange).toHaveBeenCalledWith({ questionCooldownTime: '450' });
    });

    test('prevents negative values by using Math.max(0)', () => {
      render(
        <GameplayLogicCard 
          questionCooldown="300" 
          riddleCooldown="60" 
          onChange={mockOnChange} 
        />
      );

      const rInput = screen.getByLabelText(/Riddle Cooldown/i);
      
      // Passing a negative number should result in "0" based on your handleNumericChange logic
      fireEvent.change(rInput, { target: { value: '-50' } });
      expect(mockOnChange).toHaveBeenCalledWith({ riddleCooldownTime: '0' });
    });

    test('calls onChange when riddle cooldown is updated', () => {
      render(
        <GameplayLogicCard 
          questionCooldown="300" 
          riddleCooldown="60" 
          onChange={mockOnChange} 
        />
      );

      const rInput = screen.getByLabelText(/Riddle Cooldown/i);
      
      fireEvent.change(rInput, { target: { value: '120' } });
      expect(mockOnChange).toHaveBeenCalledWith({ riddleCooldownTime: '120' });
    });

    test('handles empty string or invalid number gracefully', () => {
      render(
        <GameplayLogicCard 
          questionCooldown="300" 
          riddleCooldown="60" 
          onChange={mockOnChange} 
        />
      );

      const qInput = screen.getByLabelText(/Question Cooldown/i);
      
      // If user clears input, Number("") is 0, so cleanVal becomes "0"
      fireEvent.change(qInput, { target: { value: '' } });
      expect(mockOnChange).toHaveBeenCalledWith({ questionCooldownTime: '0' });
    });
  });
});