import { describe, it, expect } from 'vitest';
import { defaultPrintSize, offeredPrintSizes, PRINT_SIZE_OPTIONS } from './printSizes';

describe('PRINT_SIZE_OPTIONS', () => {
  it('lists locket through house plus custom', () => {
    expect(PRINT_SIZE_OPTIONS.map((option) => option.value)).toEqual([
      'locket 1x1 in',
      'wallet 2.5x3.5 in',
      '8x10 in',
      '16x20 in',
      '40x60 in',
      'house 8x10 ft',
      'custom',
    ]);
  });
});

describe('offeredPrintSizes', () => {
  it('offers only locket, wallet, 8×10, and custom when master pixels are missing', () => {
    expect(offeredPrintSizes().map((option) => option.value)).toEqual([
      'locket 1x1 in',
      'wallet 2.5x3.5 in',
      '8x10 in',
      'custom',
    ]);
    expect(offeredPrintSizes(undefined, 4000).map((option) => option.value)).toEqual([
      'locket 1x1 in',
      'wallet 2.5x3.5 in',
      '8x10 in',
      'custom',
    ]);
    expect(offeredPrintSizes(0, 0).map((option) => option.value)).toEqual([
      'locket 1x1 in',
      'wallet 2.5x3.5 in',
      '8x10 in',
      'custom',
    ]);
  });

  it('hides 16×20, 40×60, and house when master pixels are missing', () => {
    const missing = offeredPrintSizes().map((option) => option.value);
    expect(missing).not.toContain('16x20 in');
    expect(missing).not.toContain('40x60 in');
    expect(missing).not.toContain('house 8x10 ft');
    expect(missing).toContain('custom');
  });

  it('treats one-sided master dims as missing so 16×20 stays hidden', () => {
    const widthOnly = offeredPrintSizes(5000, undefined).map((option) => option.value);
    const heightOnly = offeredPrintSizes(undefined, 5000).map((option) => option.value);
    const nanHeight = offeredPrintSizes(5000, Number.NaN).map((option) => option.value);
    const infWidth = offeredPrintSizes(Number.POSITIVE_INFINITY, 5000).map((option) => option.value);
    const negative = offeredPrintSizes(-5000, 5000).map((option) => option.value);

    for (const values of [widthOnly, heightOnly, nanHeight, infWidth, negative]) {
      expect(values).toEqual(['locket 1x1 in', 'wallet 2.5x3.5 in', '8x10 in', 'custom']);
      expect(values).not.toContain('16x20 in');
    }
  });

  it('requires 300 PPI for 8×10 and smaller and 150 PPI for 16×20 and larger', () => {
    const justWallet = offeredPrintSizes(1050, 800).map((option) => option.value);
    expect(justWallet).toEqual(['locket 1x1 in', 'wallet 2.5x3.5 in', 'custom']);

    const eightByTen = offeredPrintSizes(3000, 2400).map((option) => option.value);
    expect(eightByTen).toEqual(['locket 1x1 in', 'wallet 2.5x3.5 in', '8x10 in', '16x20 in', 'custom']);

    const shyOfWall = offeredPrintSizes(2999, 2400).map((option) => option.value);
    expect(shyOfWall).toEqual(['locket 1x1 in', 'wallet 2.5x3.5 in', 'custom']);

    const fortyBySixty = offeredPrintSizes(9000, 6000).map((option) => option.value);
    expect(fortyBySixty).toContain('40x60 in');
    expect(fortyBySixty).not.toContain('house 8x10 ft');

    const house = offeredPrintSizes(18000, 14400).map((option) => option.value);
    expect(house).toEqual([
      'locket 1x1 in',
      'wallet 2.5x3.5 in',
      '8x10 in',
      '16x20 in',
      '40x60 in',
      'house 8x10 ft',
      'custom',
    ]);
  });

  it('uses the long edge so a portrait master still qualifies', () => {
    expect(offeredPrintSizes(2400, 3000).map((option) => option.value)).toContain('16x20 in');
  });

  it('offers 16×20 for the skatepark original scan 6611×4384', () => {
    const values = offeredPrintSizes(6611, 4384).map((option) => option.value);
    expect(values).toContain('16x20 in');
    expect(values).toContain('8x10 in');
    expect(values).not.toContain('40x60 in');
  });

  it('always includes custom', () => {
    expect(offeredPrintSizes().some((option) => option.value === 'custom')).toBe(true);
    expect(offeredPrintSizes(1, 1).some((option) => option.value === 'custom')).toBe(true);
    expect(offeredPrintSizes(2999, 2400).some((option) => option.value === 'custom')).toBe(true);
    expect(offeredPrintSizes(18000, 18000).some((option) => option.value === 'custom')).toBe(true);
  });
});

describe('defaultPrintSize', () => {
  it('picks the largest offered size that is not house', () => {
    expect(defaultPrintSize()).toBe('8x10 in');
    expect(defaultPrintSize(3000, 2400)).toBe('16x20 in');
    expect(defaultPrintSize(9000, 6000)).toBe('40x60 in');
    expect(defaultPrintSize(18000, 14400)).toBe('40x60 in');
    expect(defaultPrintSize(1050, 800)).toBe('wallet 2.5x3.5 in');
  });
});
