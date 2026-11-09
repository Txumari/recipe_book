import { describe, it, expect } from 'vitest';
import { resolveUserId, DEFAULT_USER_ID } from '../infrastructure/http/resolve-user-id.ts';

describe('resolveUserId', () => {
  it('returns the x-user-id header when present', () => {
    expect(resolveUserId({ headers: { 'x-user-id': 'ana' } })).toBe('ana');
  });

  it('trims surrounding whitespace', () => {
    expect(resolveUserId({ headers: { 'x-user-id': '  ana  ' } })).toBe('ana');
  });

  it('falls back to the default local user when the header is missing', () => {
    expect(resolveUserId({ headers: {} })).toBe(DEFAULT_USER_ID);
    expect(DEFAULT_USER_ID).toBe('default-local-user');
  });

  it('falls back to the default local user when the header is empty', () => {
    expect(resolveUserId({ headers: { 'x-user-id': '   ' } })).toBe(DEFAULT_USER_ID);
  });

  it('uses the first value when the header is repeated', () => {
    expect(resolveUserId({ headers: { 'x-user-id': ['ana', 'bob'] as unknown as string } })).toBe('ana');
  });
});
