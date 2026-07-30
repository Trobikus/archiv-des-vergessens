import { describe, it, expect, beforeEach, vi } from 'vitest';
import AuthService from '../core/services/auth-service.js';

describe('AuthService', () => {
  let eventBus;
  let authService;

  beforeEach(() => {
    localStorage.clear();
    eventBus = {
      publish: vi.fn(),
      subscribe: vi.fn()
    };
    authService = new AuthService(eventBus);
  });

  it('should initialize with a guest account by default', () => {
    const user = authService.getCurrentUser();
    expect(user).not.toBeNull();
    expect(user.isGuest).toBe(true);
    expect(user.username).toBe('Gast-Hüter');
    expect(authService.isLoggedIn()).toBe(false);
  });

  it('should register a new account successfully with server connection', async () => {
    const mockNetworkService = {
      isConnected: vi.fn().mockReturnValue(true),
      send: vi.fn((type, payload) => {
        if (type === 'auth:register') {
          setTimeout(() => {
            authService.handleServerAuthResponse('auth:register:success', {
              user: { id: 'usr_1', username: payload.username, email: payload.email, isGuest: false, avatar: '🛡️' },
              token: 'tok_abc'
            });
          }, 10);
        }
        return true;
      })
    };

    authService.setNetworkService(mockNetworkService);

    const res = await authService.register('TestSpieler', 'test@archiv.de', 'geheim123');
    expect(res.success).toBe(true);
    expect(res.user.username).toBe('TestSpieler');
    expect(res.user.email).toBe('test@archiv.de');
    expect(res.user.isGuest).toBe(false);

    expect(authService.isLoggedIn()).toBe(true);
    expect(eventBus.publish).toHaveBeenCalledWith('auth:registered', expect.any(Object));
  });

  it('should reject registration with invalid email or short password without hitting server', async () => {
    const mockNetworkService = {
      isConnected: vi.fn().mockReturnValue(true),
      send: vi.fn(() => true)
    };
    authService.setNetworkService(mockNetworkService);

    const resShortPass = await authService.register('TestUser', 'test@archiv.de', '123');
    expect(resShortPass.success).toBe(false);
    expect(resShortPass.error).toBe('auth.error.password_short');
    expect(mockNetworkService.send).not.toHaveBeenCalled();

    const resInvalidEmail = await authService.register('TestUser', 'invalid-email', 'geheim123');
    expect(resInvalidEmail.success).toBe(false);
    expect(resInvalidEmail.error).toBe('auth.error.email_invalid');
  });

  it('should fail registration or login when offline', async () => {
    const mockNetworkService = {
      isConnected: vi.fn().mockReturnValue(false),
      send: vi.fn(() => false)
    };
    authService.setNetworkService(mockNetworkService);

    const regRes = await authService.register('OfflineUser', 'off@archiv.de', 'pass12345');
    expect(regRes.success).toBe(false);
    expect(regRes.error).toBe('auth.error.server_offline');

    const loginRes = await authService.login('OfflineUser', 'pass12345');
    expect(loginRes.success).toBe(false);
    expect(loginRes.error).toBe('auth.error.server_offline');

    const convertRes = await authService.convertGuestToAccount('OfflineUser', 'off@archiv.de', 'pass12345');
    expect(convertRes.success).toBe(false);
    expect(convertRes.error).toBe('auth.error.server_offline');
  });

  it('should fail with server error response', async () => {
    const mockNetworkService = {
      isConnected: vi.fn().mockReturnValue(true),
      send: vi.fn((type) => {
        if (type === 'auth:register') {
          setTimeout(() => {
            authService.handleServerAuthResponse('auth:register:error', {
              error: 'auth.error.username_taken'
            });
          }, 10);
        } else if (type === 'auth:login') {
          setTimeout(() => {
            authService.handleServerAuthResponse('auth:login:error', {
              error: 'auth.error.wrong_password'
            });
          }, 10);
        }
        return true;
      })
    };

    authService.setNetworkService(mockNetworkService);

    const regRes = await authService.register('DupeUser', 'bad@archiv.de', 'geheim123');
    expect(regRes.success).toBe(false);
    expect(regRes.error).toBe('auth.error.username_taken');

    const loginRes = await authService.login('UnknownHero', 'geheim123');
    expect(loginRes.success).toBe(false);
    expect(loginRes.error).toBe('auth.error.wrong_password');
  });

  it('should handle login successfully via server', async () => {
    const mockNetworkService = {
      isConnected: vi.fn().mockReturnValue(true),
      send: vi.fn((type, payload) => {
        if (type === 'auth:login') {
          setTimeout(() => {
            authService.handleServerAuthResponse('auth:login:success', {
              user: { id: 'usr_2', username: 'LoginHero', email: 'hero@archiv.de', isGuest: false, avatar: '🛡️' },
              token: 'tok_login'
            });
          }, 10);
        }
        return true;
      })
    };

    authService.setNetworkService(mockNetworkService);

    const successRes = await authService.login('LoginHero', 'richtigesPasswort1');
    expect(successRes.success).toBe(true);
    expect(authService.isLoggedIn()).toBe(true);
    expect(authService.getToken()).toBe('tok_login');
  });

  it('should convert guest account to full account via server', async () => {
    const mockNetworkService = {
      isConnected: vi.fn().mockReturnValue(true),
      send: vi.fn((type, payload) => {
        if (type === 'auth:convertGuest') {
          setTimeout(() => {
            authService.handleServerAuthResponse('auth:convertGuest:success', {
              user: { id: 'usr_3', username: 'GastGewordenerHeld', email: 'gast@archiv.de', isGuest: false, avatar: '🛡️' },
              token: 'tok_conv'
            });
          }, 10);
        }
        return true;
      })
    };

    authService.setNetworkService(mockNetworkService);

    expect(authService.getCurrentUser().isGuest).toBe(true);

    const convertRes = await authService.convertGuestToAccount('GastGewordenerHeld', 'gast@archiv.de', 'meinPasswort99');
    expect(convertRes.success).toBe(true);
    expect(authService.getCurrentUser().isGuest).toBe(false);
    expect(authService.getCurrentUser().username).toBe('GastGewordenerHeld');
    expect(eventBus.publish).toHaveBeenCalledWith('auth:guestConverted', expect.any(Object));
  });

  it('should return to guest mode after logout', async () => {
    const mockNetworkService = {
      isConnected: vi.fn().mockReturnValue(true),
      send: vi.fn((type, payload) => {
        setTimeout(() => {
          authService.handleServerAuthResponse('auth:register:success', {
            user: { id: 'usr_logout', username: 'LogoutUser', isGuest: false },
            token: 'tok_logout'
          });
        }, 10);
        return true;
      })
    };
    authService.setNetworkService(mockNetworkService);

    await authService.register('LogoutUser', 'logout@archiv.de', 'passwort123');
    expect(authService.isLoggedIn()).toBe(true);

    authService.logout();
    expect(authService.isLoggedIn()).toBe(false);
    expect(authService.getCurrentUser().isGuest).toBe(true);
  });

  it('should prevent concurrent authentication attempts with in_progress error', async () => {
    // Simulate a slow network request
    const mockNetworkService = {
      isConnected: vi.fn().mockReturnValue(true),
      send: vi.fn(() => true) // Never calls handleServerAuthResponse, pending promise will wait
    };
    authService.setNetworkService(mockNetworkService);

    // Start first attempt
    const firstLoginPromise = authService.login('SlowUser', 'password123');

    // Attempt second login immediately
    const secondLoginRes = await authService.login('SlowUser', 'password123');
    expect(secondLoginRes.success).toBe(false);
    expect(secondLoginRes.error).toBe('auth.error.in_progress');
  });

  it('should handle token verification success and error responses', () => {
    // Simulate token verification success
    authService.handleServerAuthResponse('auth:verifyToken:success', {
      user: { id: 'usr_verified', username: 'VerifiedUser', isGuest: false },
      token: 'token_verified_123'
    });

    expect(authService.getCurrentUser().username).toBe('VerifiedUser');
    expect(authService.getToken()).toBe('token_verified_123');
    expect(authService.isLoggedIn()).toBe(true);

    // Simulate token verification error
    authService.handleServerAuthResponse('auth:verifyToken:error', {});
    expect(authService.getToken()).toBeNull();
    expect(eventBus.publish).toHaveBeenCalledWith('auth:sessionExpired', expect.any(Object));
  });
});
