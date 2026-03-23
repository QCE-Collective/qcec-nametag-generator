import type { Field } from 'src/types/nametag';

export interface ResolvedCircleColors {
  fillColor: string;
  borderColor: string;
  matched: boolean;
}

/**
 * Resolve fill and border colors for a circle field based on CSV cell value and color rules.
 * Rules are checked in order; first matching rule wins. Case-insensitive "contains" check.
 */
export function resolveCircleColors(
  field: Field,
  cellValue: string
): ResolvedCircleColors {
  if (field.type !== 'circle') {
    return {
      fillColor: field.defaultFillColor ?? '#cccccc',
      borderColor: field.defaultBorderColor ?? '#000000',
      matched: true,
    };
  }
  const rules = field.colorRules ?? [];
  const val = (cellValue ?? '').toLowerCase();
  for (const rule of rules) {
    if (rule.contains && val.includes(rule.contains.toLowerCase())) {
      return {
        fillColor: rule.fillColor ?? field.defaultFillColor ?? '#cccccc',
        borderColor: rule.borderColor ?? rule.fillColor ?? field.defaultBorderColor ?? '#000000',
        matched: true,
      };
    }
  }
  return {
    fillColor: field.defaultFillColor ?? '#cccccc',
    borderColor: field.defaultBorderColor ?? '#000000',
    matched: false,
  };
}
