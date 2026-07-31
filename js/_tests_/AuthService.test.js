import { describe, it, expect, beforeEach, vi } from 'vitest';
import AuthService from '../core/services/auth-service.js';

describe('AuthService', () => {
  let eventBus;
  let authService;

  beforeEach(() => {
    localStorage.clear();
    eventBus = { publish: vi.fn(), subscribe: vi.fn() };
    authService = new AuthService(eventBus);
  });

  function createConnectedServer({ loginError } = {}) {
    const networkService = {
      isConnected: vi.fn().mockReturnValue(true),
      send: vi.fn((type, payload) => {
        setTimeout(() => {
          if (type === 'auth:register') {
            authService.handleServerAuthResponse('auth:register:success', {
              user: { id: 'usr_server', username: payload.username, email: payload.email, isGuest: false },
              token: 'tok_registration'
            });
          }
          if (type === 'auth:login') {
            if (loginError) {
              authService.handleServerAuthResponse('auth:login:error', { error: loginError });
            } else {
              authService.handleServerAuthResponse('auth:login:success', {
                user: { id: 'usr_server', username: 'ServerHero', email: 'server@archiv.de', isGuest: false },
                token: 'tok_login'
              });
            }
          }
        }, 0);
        return true;
      })
    };
    authService.setNetworkService(networkService);
    return networkService;
  }

  it('initializes with a guest account', () => {
    expect(authService.getCurrentUser()).toMatchObject({ isGuest: true, username: 'Gast-Hüter' });
    expect(authService.isLoggedIn()).toBe(false);
  });

  it('creates an account only after server confirmation', async () => {
    createConnectedServer();

    const result = await authService.register('ServerHero', 'server@archiv.de', 'geheim123');

    expect(result).toMatchObject({ success: true, user: { id: 'usr_server' } });
    const accounts = JSON.parse(localStorage.getItem('archiv_auth_accounts'));
    expect(accounts.usr_server.isServerAccount).toBe(true);
    expect(eventBus.publish).toHaveBeenCalledWith('auth:registered', expect.any(Object));
  });

  it('rejects registration while the server is unavailable without creating a local account', async () => {
    authService.setNetworkService({ isConnected: () => false });

    const result = await authService.register('OfflineHero', 'offline@archiv.de', 'geheim123');

    expect(result).toMatchObject({ success: false, error: 'auth.error.server_unavailable' });
    expect(localStorage.getItem('archiv_auth_accounts')).toBeNull();
    expect(authService.isLoggedIn()).toBe(false);
  });

  it('returns the server login error instead of accepting a local fallback', async () => {
    const networkService = createConnectedServer({ loginError: 'auth.error.user_not_found' });
    localStorage.setItem('archiv_auth_accounts', JSON.stringify({
      usr_local: { username: 'OfflineHero', email: 'offline@archiv.de', isServerAccount: false, salt: 'salt', passwordHash: 'hash' }
    }));

    const result = await authService.login('OfflineHero', 'geheim123');

    expect(result).toMatchObject({ success: false, error: 'auth.error.user_not_found' });
    expect(networkService.send).toHaveBeenCalledWith('auth:login', expect.any(Object));
    expect(authService.isLoggedIn()).toBe(false);
  });

  it('allows an already confirmed account to log in offline on the same device', async () => {
    createConnectedServer();
    await authService.register('ServerHero', 'server@archiv.de', 'geheim123');
    authService.logout();
    authService.setNetworkService({ isConnected: () => false });

    const result = await authService.login('ServerHero', 'geheim123');

    expect(result.success).toBe(true);
    expect(authService.isLoggedIn()).toBe(true);
  });

  it('expires a session when the server rejects an unconfirmed local account', () => {
    authService.handleServerAuthResponse('auth:verifyToken:success', {
      user: { id: 'usr_local', username: 'LocalOnly', isGuest: false },
      token: 'tok_local'
    });

    authService.handleServerAuthResponse('auth:verifyToken:error', {});

    expect(authService.getToken()).toBeNull();
    expect(eventBus.publish).toHaveBeenCalledWith('auth:sessionExpired', expect.any(Object));
  });
});
