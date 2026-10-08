// Kiểm tra cỡ mẫu (mục 2.1 của tài liệu thiết kế). Thuần số nguyên, không phụ thuộc DB.

export interface SampleResult {
  passed: boolean;
  required: number;
  actual: number;
  /** Còn thiếu bao nhiêu (0 nếu đạt). */
  missing: number;
}

/** MIN_PER_STAFF / MIN_TOTAL: số phiếu tối thiểu. */
export function checkMinCount(actual: number, required: number): SampleResult {
  return { passed: actual >= required, required, actual, missing: Math.max(0, required - actual) };
}

/**
 * MIN_RATIO: số người trả lời / tổng thể ≥ tỷ lệ tối thiểu.
 * `minRatioBp` tính bằng điểm cơ bản (0,30 → 3000). So sánh chéo, không chia.
 */
export function checkMinRatio(respondents: number, population: number, minRatioBp: number): SampleResult {
  const requiredCount = Math.ceil((population * minRatioBp) / 10000);
  return {
    passed: respondents * 10000 >= minRatioBp * population,
    required: requiredCount,
    actual: respondents,
    missing: Math.max(0, requiredCount - respondents),
  };
}
