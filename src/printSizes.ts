export const PRINT_SIZE_OPTIONS = [
  { value: 'locket 1x1 in', label: 'locket — 1″ × 1″', widthIn: 1, heightIn: 1, ppi: 300 },
  { value: 'wallet 2.5x3.5 in', label: 'wallet — 2.5″ × 3.5″', widthIn: 2.5, heightIn: 3.5, ppi: 300 },
  { value: '8x10 in', label: '8″ × 10″', widthIn: 8, heightIn: 10, ppi: 300 },
  { value: '16x20 in', label: '16″ × 20″', widthIn: 16, heightIn: 20, ppi: 150 },
  { value: '40x60 in', label: '40″ × 60″', widthIn: 40, heightIn: 60, ppi: 150 },
  { value: 'house 8x10 ft', label: 'house — 8′ × 10′', widthIn: 96, heightIn: 120, ppi: 150 },
  { value: 'custom', label: 'custom' },
] as const;

export type PrintSizeOption = (typeof PRINT_SIZE_OPTIONS)[number];
export type PrintSize = PrintSizeOption['value'];

type SizedPrint = Extract<PrintSizeOption, { widthIn: number; heightIn: number; ppi: number }>;

const CUSTOM = PRINT_SIZE_OPTIONS[PRINT_SIZE_OPTIONS.length - 1]!;
const CONSERVATIVE_VALUES: readonly PrintSize[] = ['locket 1x1 in', 'wallet 2.5x3.5 in', '8x10 in', 'custom'];

function hasMasterPixels(
  masterWidth?: number,
  masterHeight?: number,
): masterWidth is number {
  return (
    typeof masterWidth === 'number' &&
    typeof masterHeight === 'number' &&
    Number.isFinite(masterWidth) &&
    Number.isFinite(masterHeight) &&
    masterWidth > 0 &&
    masterHeight > 0
  );
}

function isSizedPrint(option: PrintSizeOption): option is SizedPrint {
  return option.value !== 'custom';
}

function requiredLongEdgePx(option: SizedPrint): number {
  return Math.max(option.widthIn, option.heightIn) * option.ppi;
}

export function usesConservativePrintSizes(
  masterWidth?: number,
  masterHeight?: number,
): boolean {
  return !hasMasterPixels(masterWidth, masterHeight);
}

export const MORE_SIZING_OPTIONS_HINT = 'Inquire via email for more sizing options';

export function offeredPrintSizes(masterWidth?: number, masterHeight?: number): PrintSizeOption[] {
  if (usesConservativePrintSizes(masterWidth, masterHeight) || typeof masterHeight !== 'number') {
    return PRINT_SIZE_OPTIONS.filter((option) => CONSERVATIVE_VALUES.includes(option.value));
  }

  const longEdge = Math.max(masterWidth, masterHeight);
  const sized = PRINT_SIZE_OPTIONS.filter(isSizedPrint).filter(
    (option) => longEdge >= requiredLongEdgePx(option),
  );
  return [...sized, CUSTOM];
}

export function defaultPrintSize(masterWidth?: number, masterHeight?: number): PrintSize {
  const offered = offeredPrintSizes(masterWidth, masterHeight);
  const ranked = offered.filter((option) => option.value !== 'custom' && option.value !== 'house 8x10 ft');
  return ranked[ranked.length - 1]?.value ?? 'custom';
}
