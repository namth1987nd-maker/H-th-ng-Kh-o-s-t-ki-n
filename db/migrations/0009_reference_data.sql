-- Up Migration
-- Dữ liệu tham chiếu cố định (không phụ thuộc năm học)
INSERT INTO field (id, code, name) VALUES
 (1,'GIANG_DAY','Giảng dạy (sau học phần)'),
 (2,'TRUOC_TOT_NGHIEP','Người học trước tốt nghiệp'),
 (3,'QUAN_LY_NGUOI_HOC','Quản lý người học'),
 (4,'CUU_NGUOI_HOC','Cựu người học'),
 (5,'DON_VI_SDLD','Đơn vị sử dụng lao động'),
 (6,'CHUONG_TRINH','Chương trình đào tạo'),
 (7,'CSVC_HOC_LIEU','Cơ sở vật chất và học liệu'),
 (8,'MO_RONG','Nội dung mở rộng');

INSERT INTO respondent_group (code, name) VALUES
 ('NGUOI_HOC','Người học'),
 ('NGUOI_HOC_SAP_TN','Người học sắp tốt nghiệp'),
 ('NGUOI_HOC_VLVH','Người học hệ vừa làm vừa học'),
 ('CUU_NGUOI_HOC','Cựu người học'),
 ('GIANG_VIEN','Giảng viên'),
 ('DON_VI_SDLD','Đơn vị sử dụng lao động'),
 ('KHAC','Khác');

-- Ngưỡng và quy tắc cỡ mẫu phụ thuộc năm học nên nạp bằng `npm run db:seed`
-- (cần có ít nhất một năm học để gắn valid_from_year).
