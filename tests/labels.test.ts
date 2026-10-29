import { describe, it, expect } from 'vitest';
import { roleCount } from '@/lib/labels';

describe('roleCount', () => {
  it('reads one of a plural role in the singular', () => {
    expect(roleCount(1, 'dishwashers')).toBe('1 dishwasher');
    expect(roleCount(1, 'parking marshals')).toBe('1 parking marshal');
  });
  it('keeps the plural for other counts', () => {
    expect(roleCount(6, 'servers')).toBe('6 servers');
    expect(roleCount(0, 'cooks')).toBe('0 cooks');
  });
  it('falls back to the bare number for an empty or blank role', () => {
    expect(roleCount(1, '')).toBe('1');
    expect(roleCount(3, '   ')).toBe('3');
  });
  it('pluralises a singular role', () => {
    expect(roleCount(1, 'supervisor')).toBe('1 supervisor');
    expect(roleCount(2, 'supervisor')).toBe('2 supervisors');
  });
});
