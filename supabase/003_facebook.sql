-- =====================================================================
-- MẢNG FACEBOOK (tin nhắn trang) — chạy SAU 001_khoi_tao.sql
-- Dán vào Supabase: SQL Editor -> New query -> Run.
--
-- KHÁC Zalo ở chỗ căn bản: Facebook CÓ API CHÍNH THỨC (Messenger Platform), nên
-- không cần cầu nối chạy trên máy luôn bật, không có chuyện bị khoá nick. Đổi lại
-- phải đăng ký ứng dụng trên Meta và chịu hai luật của họ:
--   1. CỬA SỔ 24 GIỜ: chỉ nhắn tự do trong 24h kể từ tin CUỐI của khách. Quá hạn
--      thì Facebook chặn, trừ khi dùng nhãn tin đặc biệt. App ghi `het_han_luc`
--      để lễ tân nhìn là biết còn nhắn được không, khỏi gõ xong mới báo lỗi.
--   2. Phải qua App Review xin quyền `pages_messaging` thì mới nhắn được khách thật.
-- =====================================================================

-- --------------------------------------------------------------- TRANG
CREATE TABLE IF NOT EXISTS fb_pages (
  page_id     TEXT PRIMARY KEY,
  ten         TEXT,
  -- Token trang (long-lived). Bảng này RLS deny-all nên chỉ máy chủ đọc được,
  -- KHÔNG bao giờ trả về trình duyệt — xem `/facebook/ket-noi` chỉ thấy 4 ký tự cuối.
  token       TEXT NOT NULL,
  da_dang_ky  BOOLEAN DEFAULT FALSE,   -- đã subscribe webhook cho trang này chưa
  active      BOOLEAN DEFAULT TRUE,
  loi_cuoi    TEXT,                    -- token hết hạn / mất quyền thì ghi ở đây cho người biết
  kiem_luc    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------- KHÁCH
CREATE TABLE IF NOT EXISTS fb_contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id       TEXT NOT NULL,
  psid          TEXT NOT NULL,          -- mã khách, RIÊNG cho từng trang (không dùng chung được)
  ten           TEXT,
  anh           TEXT,
  sdt           TEXT,                   -- khách tự khai trong chat, lễ tân gắn tay
  sdt_norm      TEXT,                   -- 84xxx — trục nối sang lich_hen / don_hang / zalo
  last_content  TEXT,
  last_msg_at   TIMESTAMPTZ,
  last_in_at    TIMESTAMPTZ,            -- lần cuối KHÁCH nhắn -> mốc tính cửa sổ 24h
  last_out_at   TIMESTAMPTZ,
  unreplied     BOOLEAN DEFAULT FALSE,  -- khách nói câu cuối, đang chờ mình
  bot_tat       BOOLEAN DEFAULT FALSE,  -- lễ tân đã vào tay -> bot im cho hội thoại này
  msg_count     INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (page_id, psid)
);

-- -------------------------------------------------------------- TIN NHẮN
CREATE TABLE IF NOT EXISTS fb_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mid        TEXT UNIQUE NOT NULL,      -- mã tin của Facebook; UNIQUE để webhook gửi lại không nhân đôi
  page_id    TEXT NOT NULL,
  psid       TEXT NOT NULL,
  direction  TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  content    TEXT,
  boi        TEXT,                      -- ai gửi: tên nhân viên, hoặc 'bot'
  sent_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fb_contacts_cho_idx ON fb_contacts (unreplied, last_in_at DESC);
CREATE INDEX IF NOT EXISTS fb_contacts_sdt_idx ON fb_contacts (sdt_norm);
CREATE INDEX IF NOT EXISTS fb_messages_hoi_idx ON fb_messages (page_id, psid, sent_at DESC);

ALTER TABLE fb_pages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fb_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fb_messages ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------- CẤU HÌNH
INSERT INTO config (key, value, description) VALUES
  ('fb_verify_token', '', 'Chuỗi bạn tự đặt, gõ TRÙNG ở ô Verify Token khi khai webhook bên Meta'),
  ('bot_bat',         '0', 'Bot trả lời tự động: 1 = bật, 0 = tắt'),
  ('bot_nguoi_sau',   '2', 'Bot đáp tối đa bao nhiêu lượt liên tiếp rồi nhường người thật'),
  ('bot_nghi_phut',   '1', 'Cùng một khách, bot không đáp lại trong bấy nhiêu phút'),
  ('bot_dia_chi',     '',  'Địa chỉ tiệm — bot đọc câu này khi khách hỏi đường'),
  ('bot_loi_chao',    '',  'Câu chào đầu tiên. Để trống thì bot dùng câu mặc định'),
  ('bot_tu_khoa_nguoi','khiếu nại, phàn nàn, hoàn tiền, trả tiền, kiện, luật sư, dị ứng, sưng, nhiễm trùng, đau',
                      'Thấy một trong các từ này thì bot IM và gọi người thật — không bao giờ tự đáp')
ON CONFLICT (key) DO NOTHING;
