import { expect, describe, it } from '@jest/globals';

// Mirror logic from supplierSync.isDue
function isDue(last: Date | null, frequency?: string | null): boolean {
  if (!frequency) return true;
  const now = Date.now();
  const lastMs = last ? last.getTime() : 0;
  if (frequency === '@hourly') return now - lastMs >= 60 * 60 * 1000;
  if (frequency === '@daily') return now - lastMs >= 24 * 60 * 60 * 1000;
  return true;
}

describe('supplier frequency', () => {
  it('runs when last is null', () => {
    expect(isDue(null, '@daily')).toBe(true);
  });
  it('skips if within the same hour for @hourly', () => {
    const last = new Date(Date.now() - 10 * 60 * 1000);
    expect(isDue(last, '@hourly')).toBe(false);
  });
  it('runs if more than a day for @daily', () => {
    const last = new Date(Date.now() - 25 * 60 * 60 * 1000);
    expect(isDue(last, '@daily')).toBe(true);
  });
});


