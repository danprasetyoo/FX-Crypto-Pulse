import type { AlertCondition } from '@fxpulse/shared';

/**
 * Logika murni pencocokan alert (F4): "di atas" berarti harga > target,
 * "di bawah" berarti harga < target. Dipisahkan agar mudah diuji.
 */
export function conditionMet(condition: AlertCondition, price: number, target: number): boolean {
  if (!Number.isFinite(price) || !Number.isFinite(target)) return false;
  return condition === 'above' ? price > target : price < target;
}

export function describeCondition(condition: AlertCondition): string {
  return condition === 'above' ? 'di atas' : 'di bawah';
}
