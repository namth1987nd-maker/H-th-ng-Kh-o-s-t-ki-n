// So sánh bằng số nguyên, không dùng số thực: đúng 70,00% không bị cảnh báo.
// Ngưỡng lưu bằng điểm cơ bản (basis point): 70% = 7000.

export interface Counts {
  nSatisfied: number;
  nAnswers: number;
}

export function isBelowThreshold(nSatisfied: number, nAnswers: number, thresholdBp: number): boolean {
  return nAnswers > 0 && nSatisfied * 10000 < thresholdBp * nAnswers;
}

/** Giảm so với năm trước; so sánh chéo để tránh chia và làm tròn. */
export function isDeclined(cur: Counts, prev: Counts | null, tolerancePp = 0): boolean {
  if (!prev || cur.nAnswers === 0 || prev.nAnswers === 0) return false;
  const lhs = cur.nSatisfied * prev.nAnswers * 10000;
  const rhs = prev.nSatisfied * cur.nAnswers * 10000 - tolerancePp * 100 * cur.nAnswers * prev.nAnswers;
  return lhs < rhs;
}

/** '0.70' (jsonb trong bảng setting) → 7000 điểm cơ bản. */
export function toBasisPoints(value: string | number): number {
  return Math.round(Number(value) * 10000);
}

/** Tỷ lệ hiển thị, làm tròn 2 chữ số. Chỉ dùng để HIỂN THỊ, không dùng để so sánh. */
export function formatRate(nSatisfied: number, nAnswers: number): string {
  if (nAnswers === 0) return "—";
  return `${((nSatisfied / nAnswers) * 100).toFixed(2).replace(".", ",")}%`;
}
