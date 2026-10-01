-- =====================================================================
-- MẢNG LỊCH HẸN — chạy SAU 001_khoi_tao.sql
-- Dán cả file vào Supabase: Dashboard -> SQL Editor -> New query -> Run.
--
-- Vì sao không dùng "khung giờ cố định 30 phút" như lịch tư vấn thường thấy:
-- tiệm nail/mi mỗi dịch vụ một thời lượng (sơn gel 60', nối mi 150'). Khoá cứng
-- một bước giờ thì hoặc là chặn mất chỗ trống, hoặc là xếp chồng hai khách.
-- Nên lịch ở đây lưu GIỜ BẮT ĐẦU + SỐ PHÚT, và để Postgres tự chặn chồng lấn.
-- =====================================================================

-- Cần cho EXCLUDE ... USING gist khi so sánh bằng (=) trên uuid/date.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------- THỢ
-- CỐ Ý tách khỏi `nguoi_dung`: thợ làm móng không cần tài khoản đăng nhập app.
-- Chủ tiệm thêm tên thợ trong 30 giây, không phải tạo email + mật khẩu cho từng người.
CREATE TABLE IF NOT EXISTS tho (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ten        TEXT NOT NULL,
  mau        TEXT DEFAULT '#0EA5E9',    -- màu cột trên lịch, nhìn phát biết của ai
  active     BOOLEAN DEFAULT TRUE,      -- nghỉ việc thì tắt, KHÔNG xoá (xoá là mất lịch sử)
  thu_tu     INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------- DỊCH VỤ
CREATE TABLE IF NOT EXISTS dich_vu (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ten        TEXT NOT NULL,
  phut       INT NOT NULL DEFAULT 60 CHECK (phut > 0 AND phut <= 600),
  gia        NUMERIC DEFAULT 0 CHECK (gia >= 0),
  active     BOOLEAN DEFAULT TRUE,
  thu_tu     INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------- LỊCH HẸN
CREATE TABLE IF NOT EXISTS lich_hen (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ngay        DATE NOT NULL,
  -- Số PHÚT tính từ 0h thay vì kiểu TIME: cộng trừ thẳng được, và né sạch chuyện
  -- múi giờ (máy chủ Vercel chạy UTC, tiệm ở giờ VN — lưu timestamptz là mời lỗi vào nhà).
  phut_bd     INT NOT NULL CHECK (phut_bd >= 0 AND phut_bd < 1440),
  phut        INT NOT NULL CHECK (phut > 0 AND phut <= 600),

  tho_id      UUID NOT NULL REFERENCES tho (id) ON DELETE RESTRICT,
  dich_vu_id  UUID REFERENCES dich_vu (id) ON DELETE SET NULL,
  -- CHỤP LẠI tên + giá lúc đặt. Đổi bảng giá tháng sau không được làm sai lịch sử tháng trước.
  dich_vu_ten TEXT,
  gia         NUMERIC DEFAULT 0,

  khach_ten   TEXT NOT NULL,
  sdt         TEXT,
  sdt_norm    TEXT,          -- 84xxx — CÙNG trục nối với zalo_bridge_contacts.phone_norm và don_hang.sdt
  ghi_chu     TEXT,

  trang_thai  TEXT NOT NULL DEFAULT 'dat'
              CHECK (trang_thai IN ('dat', 'den', 'vang', 'huy')),
  nguon       TEXT DEFAULT 'tiem' CHECK (nguon IN ('tiem', 'web')),  -- tiệm nhập hộ · khách tự đặt
  nhac_luc    TIMESTAMPTZ,   -- đã nhắc khách lúc nào (NULL = chưa nhắc)
  don_hang_id UUID REFERENCES don_hang (id) ON DELETE SET NULL,      -- khách đến xong -> sinh đơn

  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),

  -- CHỐT CUỐI, đặt ở CSDL chứ không ở mã web: một thợ KHÔNG THỂ nhận hai khách
  -- chồng giờ. Hai người cùng bấm đặt một lúc thì tầng ứng dụng kiểm cũng lọt —
  -- chỉ ràng buộc ở đây mới chặn được. Huỷ thì nhả chỗ cho người khác.
  CONSTRAINT lich_hen_khong_trung EXCLUDE USING gist (
    tho_id WITH =,
    ngay   WITH =,
    int4range(phut_bd, phut_bd + phut) WITH &&
  ) WHERE (trang_thai <> 'huy')
);

CREATE INDEX IF NOT EXISTS lich_hen_ngay_idx     ON lich_hen (ngay, phut_bd);
CREATE INDEX IF NOT EXISTS lich_hen_sdt_idx      ON lich_hen (sdt_norm);
CREATE INDEX IF NOT EXISTS lich_hen_nhac_idx     ON lich_hen (ngay, trang_thai) WHERE nhac_luc IS NULL;

-- ------------------------------------------------------------ KHOÁ RLS
-- Deny-all như mọi bảng khác: chỉ máy chủ (service_role) đọc ghi. Trang khách tự
-- đặt lịch KHÔNG nói chuyện thẳng với CSDL, nó đi qua route API của mình.
ALTER TABLE tho      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dich_vu  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lich_hen ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------- GIỜ MỞ CỬA
-- Để trong `config` cho chủ tiệm sửa được mà không cần deploy lại.
INSERT INTO config (key, value, description) VALUES
  ('lich_gio_mo',  '09:00', 'Giờ mở cửa (HH:MM)'),
  ('lich_gio_dong','20:00', 'Giờ đóng cửa (HH:MM)'),
  ('lich_buoc',    '15',    'Bước chia khung giờ, tính bằng phút'),
  ('lich_ten_tiem','Tiệm của bạn', 'Tên hiện trên trang khách tự đặt lịch'),
  ('lich_cho_dat_web','1',  'Cho khách tự đặt qua web? 1 = bật, 0 = tắt'),
  ('lich_toi_da_ngay','30', 'Khách tự đặt được trước tối đa bao nhiêu ngày')
ON CONFLICT (key) DO NOTHING;
