// Kiểu viết tay cho Kysely, khớp db/migrations. Sau khi có DB chạy được, sinh tự động bằng
// `npm run db:codegen` (ra src/core/db/generated.ts) rồi đổi import trong core/db/index.ts.
import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely";

type Id = Generated<number>;
type BigId = ColumnType<string, string | number | bigint | undefined, never>; // pg trả bigint dạng chuỗi
type Ts = ColumnType<Date, Date | string | undefined, Date | string>;
type Json = unknown;

export interface AppUserTable { id: Id; email: string; full_name: string; role: "ADMIN" | "OFFICER" | "LEADER" | "VIEWER"; unit_id: number | null; active: Generated<boolean>; created_at: Generated<Date>; password_hash: string | null; }
export interface OrgUnitTable { id: Id; code: string; name: string; kind: "KHOA" | "NGANH" | "BO_MON" | "PHONG_BAN"; parent_id: number | null; }
export interface StaffTable { id: Id; code: string; full_name: string; staff_type: "GIANG_VIEN" | "GVCN" | "LANH_DAO" | "CAN_BO"; unit_id: number | null; active: Generated<boolean>; }
export interface StaffAliasTable { alias_norm: string; staff_id: number; }
export interface CourseTable { id: Id; code: string; name: string; unit_id: number | null; }
export interface ProgramTable { id: Id; code: string; name: string; level: string | null; unit_id: number | null; }
export interface EmployerTable { id: Id; code: string; name: string; }
export interface AcademicYearTable { id: Generated<number>; code: string; start_date: ColumnType<Date, string | Date, string | Date>; end_date: ColumnType<Date, string | Date, string | Date>; }
export interface FieldTable { id: number; code: string; name: string; }
export interface RespondentGroupTable { code: string; name: string; }

export interface QuestionnaireTable { id: Id; field_id: number; version: number; valid_from_year: number; valid_to_year: number | null; }
export interface CriterionTable { id: Id; questionnaire_id: number; code: string; grp: string | null; text: string; sort_order: number; }

export interface ImportBatchTable { id: BigId; public_id: Generated<string>; year_id: number; form_id: number | null; file_name: string; file_sha256: Buffer; reverse_scale: Generated<boolean>; status: "STAGED" | "COMMITTED" | "ROLLED_BACK" | "FAILED"; n_submissions: Generated<number>; n_answers: Generated<number>; created_by: number | null; created_at: Generated<Date>; committed_at: Date | null; }
export interface StgRowTable { batch_id: string | number; sheet: string; row_no: number; data: Json; }
export interface ImportErrorTable { id: BigId; batch_id: string | number; sheet: string; row_no: number; col_name: string | null; code: string; message: string; }
export interface ColumnMappingTable { id: Id; name: string; field_id: number; mapping: Json; created_by: number | null; created_at: Generated<Date>; }

export interface SubmissionTable {
  id: BigId; batch_id: string | number; year_id: number; semester: number | null; field_id: number; questionnaire_id: number;
  group_code: string; unit_id: number | null; staff_id: number | null; course_id: number | null; program_id: number | null; employer_id: number | null;
  channel: "PAPER" | "ONLINE" | "MEETING"; respondent_hash: Buffer | null; submitted_at: Ts | null; source_row: number; attrs: Json | null;
}
export interface AnswerTable { submission_id: string | number; criterion_id: number; questionnaire_id: number; score_raw: number; score: number; }

export interface SampleRuleTable { id: Id; field_id: number; group_code: string; kind: "MIN_PER_STAFF" | "MIN_TOTAL" | "MIN_RATIO"; min_value: string; valid_from_year: number; valid_to_year: number | null; note: string | null; }
export interface SettingTable { key: string; value: Json; valid_from_year: number; }
export interface PopulationTable { id: Id; year_id: number; group_code: string; unit_id: number | null; total: number; source: string | null; }

export interface PdcaActionTable {
  id: BigId; year_id: number; field_id: number; criterion_code: string | null; unit_id: number | null; staff_id: number | null; course_id: number | null; program_id: number | null;
  trigger_type: "BELOW_THRESHOLD" | "DECLINED"; n_answers: number; n_satisfied: number; prev_n_answers: number | null; prev_n_satisfied: number | null;
  cause: string | null; solution: string | null; owner_id: number | null; due_date: Date | string | null;
  status: Generated<"OPEN" | "IN_PROGRESS" | "DONE" | "VERIFIED">; check_note: string | null; act_note: string | null; created_at: Generated<Date>; updated_at: Generated<Date>;
}
export interface ReportRunTable { id: BigId; public_id: Generated<string>; year_id: number; type: string; format: "docx" | "xlsx" | "pdf"; params: Json; data_snapshot: Json; batch_ids: string[]; template_ver: string | null; app_version: string | null; file_path: string; file_sha256: Buffer; created_by: number | null; created_at: Generated<Date>; }
export interface AuditLogTable { id: BigId; user_id: number | null; action: string; entity: string; entity_id: string | null; detail: Json | null; created_at: Generated<Date>; }

// Module forms: phiếu đánh giá (thuộc 1 lĩnh vực) → câu hỏi (migration 0012)
export interface FormTable { id: Id; code: Generated<string>; name: string; field_id: number; description: string | null; active: Generated<boolean>; created_at: Generated<Date>; }
type QKind = "SCALE" | "CHOICE" | "TEXT";
export interface FormQuestionTable { form_id: number; q_no: number; text: string; kind: ColumnType<QKind, QKind | undefined, QKind>; }
export interface FormOptionTable { form_id: number; q_no: number; opt_key: string; text: string; score: number | null; }

// Module subjects: đối tượng → đợt → phiếu → câu trả lời (migration 0011)
export interface SurveySubjectTable { id: Id; code: Generated<string>; name: string; name_norm: string; created_at: Generated<Date>; }
export interface SurveyRoundTable { id: BigId; subject_id: number; form_id: number | null; batch_id: string | number; round_no: number; year_id: number; n_responses: Generated<number>; created_at: Generated<Date>; }
export interface RoundQuestionTable { round_id: string | number; q_no: number; text: string; }
export interface RoundResponseTable { id: BigId; round_id: string | number; source_row: number; submitted_at: Date | null; extra: Json | null; }
export interface RoundAnswerTable { response_id: string | number; round_id: string | number; q_no: number; value_text: string; score: number | null; opt_key: string | null; }

// Materialized view (chỉ đọc)
export interface MvSatFieldYear { year_id: number; field_id: number; n_submissions: string; n_answers: string; n_satisfied: string; }
export interface MvSatCriterionYear { year_id: number; field_id: number; criterion_code: string; n_answers: string; n_satisfied: string; n5: string; n4: string; n3: string; n2: string; n1: string; }
export interface MvSatUnitYear { year_id: number; field_id: number; unit_key: number; n_submissions: string; n_answers: string; n_satisfied: string; }
export interface MvSatStaffCourseYear { year_id: number; field_id: number; staff_key: number; course_key: number; n_submissions: string; n_answers: string; n_satisfied: string; }

export interface DB {
  app_user: AppUserTable; org_unit: OrgUnitTable; staff: StaffTable; staff_alias: StaffAliasTable;
  course: CourseTable; program: ProgramTable; employer: EmployerTable; academic_year: AcademicYearTable;
  field: FieldTable; respondent_group: RespondentGroupTable;
  questionnaire: QuestionnaireTable; criterion: CriterionTable;
  import_batch: ImportBatchTable; stg_row: StgRowTable; import_error: ImportErrorTable; column_mapping: ColumnMappingTable;
  submission: SubmissionTable; answer: AnswerTable;
  sample_rule: SampleRuleTable; setting: SettingTable; population: PopulationTable;
  pdca_action: PdcaActionTable; report_run: ReportRunTable; audit_log: AuditLogTable;
  form: FormTable; form_question: FormQuestionTable; form_option: FormOptionTable;
  survey_subject: SurveySubjectTable; survey_round: SurveyRoundTable; round_question: RoundQuestionTable;
  round_response: RoundResponseTable; round_answer: RoundAnswerTable;
  mv_sat_field_year: MvSatFieldYear; mv_sat_criterion_year: MvSatCriterionYear;
  mv_sat_unit_year: MvSatUnitYear; mv_sat_staff_course_year: MvSatStaffCourseYear;
}

export type AppUser = Selectable<AppUserTable>;
export type NewSubmission = Insertable<SubmissionTable>;
export type NewAnswer = Insertable<AnswerTable>;
export type PdcaUpdate = Updateable<PdcaActionTable>;
