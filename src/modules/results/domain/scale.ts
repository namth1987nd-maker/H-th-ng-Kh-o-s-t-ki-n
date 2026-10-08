// Thang đo 5 mức, chuẩn hóa nội bộ: 5 = Rất hài lòng, 4 = Hài lòng, … 1 = Không hài lòng.
export type Score = 1 | 2 | 3 | 4 | 5;

export const SCORE_LABELS: Record<Score, string> = {
  5: "Rất hài lòng",
  4: "Hài lòng",
  3: "Trung bình",
  2: "Chưa hài lòng",
  1: "Không hài lòng",
};

export function normalizeScore(raw: number, reverse: boolean): Score {
  if (!Number.isInteger(raw) || raw < 1 || raw > 5) {
    throw new RangeError(`Điểm không hợp lệ: ${raw}`);
  }
  return (reverse ? 6 - raw : raw) as Score;
}

/** Hài lòng = Rất hài lòng (5) hoặc Hài lòng (4). */
export const isSatisfied = (score: number): boolean => score >= 4;

/**
 * Phân bố điểm thô của một lô → nghi đảo thang khi đa số điểm rơi vào 1–2
 * (dữ liệu khảo sát hài lòng thường lệch về 4–5).
 */
export function suspectReversedScale(rawCounts: Record<number, number>): boolean {
  const total = Object.values(rawCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return false;
  const low = (rawCounts[1] ?? 0) + (rawCounts[2] ?? 0);
  const high = (rawCounts[4] ?? 0) + (rawCounts[5] ?? 0);
  return low > high;
}
