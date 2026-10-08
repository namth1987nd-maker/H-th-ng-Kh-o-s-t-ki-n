// 8 lĩnh vực (mục 2.1). Khớp bảng `field` được nạp ở migration 0009.
export const FIELDS = [
  { id: 1, code: "GIANG_DAY", name: "Giảng dạy (sau học phần)" },
  { id: 2, code: "TRUOC_TOT_NGHIEP", name: "Người học trước tốt nghiệp" },
  { id: 3, code: "QUAN_LY_NGUOI_HOC", name: "Quản lý người học" },
  { id: 4, code: "CUU_NGUOI_HOC", name: "Cựu người học" },
  { id: 5, code: "DON_VI_SDLD", name: "Đơn vị sử dụng lao động" },
  { id: 6, code: "CHUONG_TRINH", name: "Chương trình đào tạo" },
  { id: 7, code: "CSVC_HOC_LIEU", name: "Cơ sở vật chất và học liệu" },
  { id: 8, code: "MO_RONG", name: "Nội dung mở rộng" },
] as const;

export type FieldCode = (typeof FIELDS)[number]["code"];

export const fieldByCode = (code: string) => FIELDS.find((f) => f.code === code);
