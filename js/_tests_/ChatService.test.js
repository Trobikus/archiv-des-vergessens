import { describe, expect, it, vi } from 'vitest';
import ChatService from '../core/services/chat-service.js';

describe('ChatService', () => {
  it('keeps clan messages local while no server-side clan contract exists', () => {
    let state = {
      hero: { name: 'Test-Hüter' },
      chat: { global: [], clan: [] }
    };
    const stateManager = {
      getState: () => state,
      dispatch: (updater) => {
        state = updater(state);
      }
    };
    const eventBus = { publish: vi.fn() };
    const service = new ChatService(stateManager, eventBus, null, null);

    const result = service.sendClanMessage('Lokale Nachricht');

    expect(result.success).toBe(true);
    expect(state.chat.clan).toHaveLength(1);
    expect(state.chat.clan[0]).toMatchObject({
      player: 'Test-Hüter',
      message: 'Lokale Nachricht',
      clanId: 'local_clan'
    });
    expect(eventBus.publish).toHaveBeenCalledWith('chat:clanMessage', expect.any(Object));
  });
});
