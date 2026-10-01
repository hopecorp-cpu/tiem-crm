-- ============================================================================
-- ZALO CRM — KHỞI TẠO CƠ SỞ DỮ LIỆU (chạy MỘT LẦN trong Supabase SQL Editor)
--
-- Cách chạy: Supabase Dashboard → SQL Editor → dán toàn bộ file này → Run.
-- Chạy lại nhiều lần không sao (mọi lệnh đều IF NOT EXISTS).
--
-- Mọi bảng bật RLS deny-all: nội dung chat + SĐT khách là dữ liệu cá nhân,
-- chỉ service_role (server) đọc/ghi được. Trình duyệt không bao giờ chạm thẳng vào bảng.
-- ============================================================================

-- ── 1. NGƯỜI DÙNG CRM ───────────────────────────────────────────────────────
-- Tài khoản đăng nhập tạo trong Supabase Auth (hoặc bằng scripts/tao-nguoi-dung.mjs);
-- bảng này giữ hồ sơ: tên + vai trò. Tên (ho_ten) phải KHỚP với sale_name gắn trên
-- nick Zalo thì nhân viên mới thấy được hộp thư của mình.
CREATE TABLE IF NOT EXISTS nguoi_dung (
  id         UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  ho_ten     TEXT NOT NULL,
  vai_tro    TEXT NOT NULL DEFAULT 'nhan-vien',   -- 'quan-ly' (thấy mọi nick) · 'nhan-vien' (chỉ nick mình cầm)
  active     BOOLEAN DEFAULT TRUE,                -- tắt khi nghỉ việc — khoá mọi trang ngay
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. KHO CẤU HÌNH key-value ───────────────────────────────────────────────
-- Hàng đợi gửi tin, trạng thái cầu nối, sổ thu hồi, danh sách từ cấm... đều nằm đây.
CREATE TABLE IF NOT EXISTS config (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. NICK ZALO ĐANG NỐI VÀO CRM ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zalo_bridge_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  own_id        TEXT UNIQUE NOT NULL,      -- uid Zalo của chính nick
  display_name  TEXT,                      -- tên hiển thị trên Zalo
  sale_name     TEXT,                      -- khớp nguoi_dung.ho_ten — nhân viên nào cầm nick này
  last_seen_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. KHÁCH / HỘI THOẠI ────────────────────────────────────────────────────
-- Khoá nối sang đơn hàng là phone_norm (84xxx). SĐT thường CHƯA có lúc khách mới
-- nhắn — điền dần khi lộ ra (khách gửi số, hoặc số nằm trong tên hội thoại).
CREATE TABLE IF NOT EXISTS zalo_bridge_contacts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  own_id         TEXT NOT NULL,            -- nick nào đang giữ khách này
  zalo_uid       TEXT NOT NULL,            -- uid Zalo của khách (hoặc id nhóm)
  display_name   TEXT,
  phone          TEXT,
  phone_norm     TEXT,                     -- 84xxx — trục nối sang don_hang.sdt
  thread_type    TEXT DEFAULT 'user',      -- user · group
  unread_count   INT  DEFAULT 0,
  last_content   TEXT,                     -- nội dung tin cuối (dòng xem trước cột trái)
  last_type      TEXT,
  first_seen_at  TIMESTAMPTZ DEFAULT NOW(),
  last_msg_at    TIMESTAMPTZ,              -- tin gần nhất (bất kể ai nhắn)
  last_in_at     TIMESTAMPTZ,              -- lần cuối KHÁCH nhắn
  last_out_at    TIMESTAMPTZ,              -- lần cuối MÌNH nhắn
  unreplied      BOOLEAN DEFAULT FALSE,    -- khách nói câu cuối → đang chờ mình trả lời
  msg_count      INT DEFAULT 0,
  zalo_name      TEXT,                     -- tên Zalo thật (khác display_name mình tự đặt)
  ngay_sinh      TEXT,                     -- "dd/mm/yyyy" như Zalo trả, giữ nguyên chuỗi
  trang_thai     TEXT,                     -- câu status trên Zalo
  global_id      TEXT,
  la_ban_be      BOOLEAN DEFAULT FALSE,    -- có trong danh bạ (đã kết bạn)
  nhan_sale      TEXT[] DEFAULT '{}',      -- nhãn nhân viên gắn cho khách
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (own_id, zalo_uid)
);
CREATE INDEX IF NOT EXISTS idx_zbc_phone   ON zalo_bridge_contacts (phone_norm);
CREATE INDEX IF NOT EXISTS idx_zbc_unrep   ON zalo_bridge_contacts (unreplied, last_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_zbc_lastmsg ON zalo_bridge_contacts (last_msg_at DESC);
CREATE INDEX IF NOT EXISTS idx_zbc_type    ON zalo_bridge_contacts (thread_type, last_msg_at DESC);
CREATE INDEX IF NOT EXISTS idx_zbc_unread  ON zalo_bridge_contacts (unread_count) WHERE unread_count > 0;
CREATE INDEX IF NOT EXISTS idx_zbc_nhan    ON zalo_bridge_contacts USING GIN (nhan_sale);

-- ── 5. TIN NHẮN ─────────────────────────────────────────────────────────────
-- Bản đầu chỉ lưu CHỮ; tin ảnh/video/tệp ghi nhãn loại ([Hình ảnh], [Tệp]...).
-- msg_id là khoá chống trùng: listener có thể bắn lại tin khi nối lại kết nối.
CREATE TABLE IF NOT EXISTS zalo_bridge_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  msg_id       TEXT UNIQUE NOT NULL,
  own_id       TEXT NOT NULL,
  thread_id    TEXT NOT NULL,              -- uid khách (chat 1-1) hoặc id nhóm
  thread_type  TEXT NOT NULL,              -- user · group
  zalo_uid     TEXT,                       -- ai gửi
  direction    TEXT NOT NULL,              -- in (khách) · out (mình)
  content      TEXT,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_zbm_thread ON zalo_bridge_messages (own_id, thread_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_zbm_sent   ON zalo_bridge_messages (sent_at DESC);

-- ── 6. BẢNG NHÃN ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zalo_nhan (
  id         BIGINT PRIMARY KEY,   -- nhãn tạo trong CRM dùng id âm
  ten        TEXT NOT NULL,
  mau        TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. ĐƠN HÀNG (tuỳ chọn) ──────────────────────────────────────────────────
-- Đổ đơn hàng của bạn vào đây (theo SĐT) thì CRM tự gắn thẻ khách: VIP (từ 3 đơn
-- hoặc từ 5 triệu) · Mua lại (từ 2 đơn) · Đã mua — suy từ ĐƠN THẬT, không phải cờ
-- ai đó bấm tay. Không có dữ liệu thì thẻ để trống, mọi thứ khác chạy bình thường.
CREATE TABLE IF NOT EXISTS don_hang (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sdt        TEXT NOT NULL,                -- SĐT khách (0xxx hoặc 84xxx đều được)
  khach      TEXT,
  khach_tra  NUMERIC DEFAULT 0,            -- số tiền khách trả
  ngay       DATE,
  san_pham   JSONB,                        -- ["Tên món 1", "Tên món 2"] hoặc [{"ten": "..."}]
  sale       TEXT,                         -- ai bán
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dh_sdt  ON don_hang (sdt);
CREATE INDEX IF NOT EXISTS idx_dh_ngay ON don_hang (ngay DESC);

-- ── 8. NHẬT KÝ CHĂM SÓC ─────────────────────────────────────────────────────
-- Nút "Đã nhắn / Đã gọi / Tặng quà" trong hộp thư ghi vào đây — dòng thời gian
-- hoạt động của từng khách.
CREATE TABLE IF NOT EXISTS cham_soc (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL,
  customer_name  TEXT,
  sale_name      TEXT,
  kind           TEXT NOT NULL DEFAULT 'message',   -- message · call · gift
  channel        TEXT DEFAULT 'zalo',
  content        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cs_phone ON cham_soc (customer_phone, created_at DESC);

-- ── 9. CÔNG VIỆC ────────────────────────────────────────────────────────────
-- Nút "Tạo việc" trong hộp thư ghi vào đây.
CREATE TABLE IF NOT EXISTS cong_viec (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  assignee_id UUID,                        -- nguoi_dung.id
  priority    TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status      TEXT DEFAULT 'todo'   CHECK (status   IN ('todo', 'doing', 'done', 'cancelled')),
  due_date    DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cv_assignee ON cong_viec (assignee_id, status);

-- ── 10. ẢNH CHỤP SỐ THÀNH VIÊN NHÓM (tuỳ chọn) ──────────────────────────────
-- Nếu bạn có máy đếm thành viên nhóm riêng thì ghi vào đây; trang Nhóm sẽ hiện số.
-- Không có thì cột thành viên hiện "chưa đo" — đó là sự thật, không phải lỗi.
CREATE TABLE IF NOT EXISTS zalo_group_snapshots (
  id       BIGSERIAL PRIMARY KEY,
  group_id TEXT NOT NULL,
  ten_nhom TEXT,
  so_tv    INTEGER NOT NULL,
  ngay     DATE NOT NULL,
  chup_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, ngay)
);

-- ── RLS: chặn hết, chỉ service_role đi qua ──────────────────────────────────
ALTER TABLE nguoi_dung            ENABLE ROW LEVEL SECURITY;
ALTER TABLE config                ENABLE ROW LEVEL SECURITY;
ALTER TABLE zalo_bridge_accounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE zalo_bridge_contacts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE zalo_bridge_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE zalo_nhan             ENABLE ROW LEVEL SECURITY;
ALTER TABLE don_hang              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cham_soc              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cong_viec             ENABLE ROW LEVEL SECURITY;
ALTER TABLE zalo_group_snapshots  ENABLE ROW LEVEL SECURITY;
