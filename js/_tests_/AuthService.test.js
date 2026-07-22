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

  it('should register a new account successfully', async () => {
    const res = await authService.register('TestSpieler', 'test@archiv.de', 'geheim123');
    expect(res.success).toBe(true);
    expect(res.user.username).toBe('TestSpieler');
    expect(res.user.email).toBe('test@archiv.de');
    expect(res.user.isGuest).toBe(false);

    expect(authService.isLoggedIn()).toBe(true);
    expect(eventBus.publish).toHaveBeenCalledWith('auth:registered', expect.any(Object));
  });

  it('should reject registration with invalid email or short password', async () => {
    const resShortPass = await authService.register('TestUser', 'test@archiv.de', '123');
    expect(resShortPass.success).toBe(false);
    expect(resShortPass.error).toBe('auth.error.password_short');

    const resInvalidEmail = await authService.register('TestUser', 'invalid-email', 'geheim123');
    expect(resInvalidEmail.success).toBe(false);
    expect(resInvalidEmail.error).toBe('auth.error.email_invalid');
  });

  it('should prevent duplicate usernames or emails', async () => {
    await authService.register('UniqueUser', 'unique@archiv.de', 'pass12345');
    authService.logout();

    const dupName = await authService.register('UniqueUser', 'other@archiv.de', 'pass12345');
    expect(dupName.success).toBe(false);
    expect(dupName.error).toBe('auth.error.username_taken');

    const dupEmail = await authService.register('OtherUser', 'unique@archiv.de', 'pass12345');
    expect(dupEmail.success).toBe(false);
    expect(dupEmail.error).toBe('auth.error.email_taken');
  });

  it('should handle login with correct and incorrect credentials', async () => {
    await authService.register('LoginHero', 'hero@archiv.de', 'richtigesPasswort1');
    authService.logout();

    // Falsches Passwort
    const failRes = await authService.login('LoginHero', 'falschesPasswort');
    expect(failRes.success).toBe(false);
    expect(failRes.error).toBe('auth.error.wrong_password');

    // Richtiges Passwort
    const successRes = await authService.login('LoginHero', 'richtigesPasswort1');
    expect(successRes.success).toBe(true);
    expect(authService.isLoggedIn()).toBe(true);
  });

  it('should convert guest account to full account', async () => {
    expect(authService.getCurrentUser().isGuest).toBe(true);

    const convertRes = await authService.convertGuestToAccount('GastGewordenerHeld', 'gast@archiv.de', 'meinPasswort99');
    expect(convertRes.success).toBe(true);
    expect(authService.getCurrentUser().isGuest).toBe(false);
    expect(authService.getCurrentUser().username).toBe('GastGewordenerHeld');
    expect(eventBus.publish).toHaveBeenCalledWith('auth:guestConverted', expect.any(Object));
  });

  it('should return to guest mode after logout', async () => {
    await authService.register('LogoutUser', 'logout@archiv.de', 'passwort123');
    expect(authService.isLoggedIn()).toBe(true);

    authService.logout();
    expect(authService.isLoggedIn()).toBe(false);
    expect(authService.getCurrentUser().isGuest).toBe(true);
  });
});
