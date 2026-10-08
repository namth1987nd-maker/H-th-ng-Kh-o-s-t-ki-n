// API công khai (client-safe) của module results. Module khác chỉ import từ đây hoặc từ ./server.
export { FIELDS, fieldByCode, type FieldCode } from "./domain/fields";
export { SCORE_LABELS, isSatisfied, normalizeScore, suspectReversedScale, type Score } from "./domain/scale";
