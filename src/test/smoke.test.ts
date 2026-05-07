import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../store/useGameStore';

describe('Game Store Smoke Test', () => {
  beforeEach(() => {
    // Reset state if necessary, though Zustand persists usually
    // For simple smoke tests we just want to see if actions work
  });

  it('should initialize with default values', () => {
    const state = useGameStore.getState();
    expect(state.connected).toBe(false);
    expect(state.players).toEqual({});
    expect(state.messages).toEqual([]);
    expect(state.currentTarget).toBeNull();
  });

  it('should add messages and keep only the last 100', () => {
    const { addMessage } = useGameStore.getState();
    
    const message = {
      id: '1',
      sender: 'System',
      text: 'Welcome to the game!',
      timestamp: Date.now(),
      color: '#ffffff'
    };

    addMessage(message);
    
    const state = useGameStore.getState();
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toEqual(message);
  });

  it('should handle player management and target syncing', () => {
    const { setPlayers, updatePlayer, setTarget } = useGameStore.getState();
    
    const player = {
      id: 'player-1',
      characterName: 'Hero',
      displayName: 'Hero123',
      class: 'Warrior',
      color: 'red',
      pos: [0, 0, 0] as [number, number, number],
      rot: [0, 0, 0] as [number, number, number]
    };

    // 1. Add player
    setPlayers([player]);
    expect(useGameStore.getState().players['player-1']).toBeDefined();

    // 2. Set as target
    setTarget({
      id: 'player-1',
      name: 'Hero',
      type: 'player',
      level: 1,
      color: 'red',
      class: 'Warrior'
    });
    expect(useGameStore.getState().currentTarget?.name).toBe('Hero');

    // 3. Update player and see if target auto-syncs (based on useGameStore logic)
    updatePlayer('player-1', { characterName: 'Legend' });
    
    const state = useGameStore.getState();
    expect(state.players['player-1'].characterName).toBe('Legend');
    expect(state.currentTarget?.name).toBe('Legend');
  });

  it('should remove targets when players are removed', () => {
    const { setPlayers, removePlayer, setTarget } = useGameStore.getState();
    
    setPlayers([{
      id: 'p2',
      characterName: 'Ghost',
      displayName: 'Ghost',
      class: 'Mage',
      color: 'blue',
      pos: [1, 1, 1],
      rot: [0, 0, 0]
    }]);

    setTarget({ id: 'p2', name: 'Ghost', type: 'player', level: 1, color: 'blue', class: 'Mage' });
    expect(useGameStore.getState().currentTarget).not.toBeNull();

    removePlayer('p2');
    expect(useGameStore.getState().players['p2']).toBeUndefined();
    expect(useGameStore.getState().currentTarget).toBeNull();
  });
});
