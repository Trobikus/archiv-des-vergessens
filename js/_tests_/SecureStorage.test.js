import { describe, it, expect, beforeEach } from 'vitest';
import { SecureStorage } from '../core/persistence/secure-storage.js';

describe('SecureStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should encrypt and decrypt objects correctly', () => {
    const data = { token: 'secret_token_123', user: { id: 'usr_456', name: 'Held' } };
    SecureStorage.setItemSync('test_key', data);

    // Verify stored item is encrypted (does not contain plain text token or user id)
    const rawStored = localStorage.getItem('test_key');
    expect(rawStored).toBeDefined();
    expect(rawStored.startsWith('__enc_v1__:')).toBe(true);
    expect(rawStored).not.toContain('secret_token_123');
    expect(rawStored).not.toContain('usr_456');

    // Retrieve and decrypt
    const restored = SecureStorage.getItemSync('test_key');
    expect(restored).toEqual(data);
  });

  it('should auto-migrate legacy plain-text items to encrypted format on read', () => {
    const legacyPlainData = { token: 'legacy_plain_token', user: 'legacy_user' };
    localStorage.setItem('legacy_key', JSON.stringify(legacyPlainData));

    // Reading legacy key should return parsed object and automatically re-save encrypted
    const restored = SecureStorage.getItemSync('legacy_key');
    expect(restored).toEqual(legacyPlainData);

    // Verify raw storage now has encrypted prefix
    const rawAfterRead = localStorage.getItem('legacy_key');
    expect(rawAfterRead.startsWith('__enc_v1__:')).toBe(true);
    expect(rawAfterRead).not.toContain('legacy_plain_token');
  });

  it('should handle string values and removeItem correctly', () => {
    SecureStorage.setItemSync('str_key', 'plain_string_value');
    expect(SecureStorage.getItemSync('str_key')).toBe('plain_string_value');

    SecureStorage.removeItem('str_key');
    expect(SecureStorage.getItemSync('str_key')).toBeNull();
  });
});
