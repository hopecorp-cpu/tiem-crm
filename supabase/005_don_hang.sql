-- ════════════════════════════════════════════════════════════════════════════
-- 005 — MÀN ĐƠN HÀNG
-- Chạy SAU 001. Chỉ THÊM cột vào bảng `don_hang` đã có ở lõi, không dựng bảng mới:
-- đơn sinh từ lịch hẹn và đơn gõ tay phải nằm CHUNG một bảng, nếu không thì thẻ
-- VIP/Mua lại bên hộp thư Zalo chỉ nhìn thấy một nửa số tiền khách đã trả.
-- Dán lại nhiều lần không sao.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE don_hang ADD COLUMN IF NOT EXISTS ghi_chu    TEXT;
ALTER TABLE don_hang ADD COLUMN IF NOT EXISTS sdt_norm   TEXT;
ALTER TABLE don_hang ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- `sdt_norm` (dạng 84xxx) là trục nối sang Zalo và sang lịch hẹn. Cố ý KHÔNG khoá ngoại:
-- ba mảng gặp nhau ở số điện thoại, không dính nhau bằng id.
CREATE INDEX IF NOT EXISTS idx_dh_sdt_norm ON don_hang (sdt_norm);
CREATE INDEX IF NOT EXISTS idx_dh_tao      ON don_hang (created_at DESC);

-- Lấp `sdt_norm` cho các đơn đã có từ trước (0xxx -> 84xxx).
UPDATE don_hang SET sdt_norm =
  CASE
    WHEN regexp_replace(sdt, '[^0-9]', '', 'g') LIKE '0%'
      THEN '84' || substring(regexp_replace(sdt, '[^0-9]', '', 'g') FROM 2)
    WHEN regexp_replace(sdt, '[^0-9]', '', 'g') LIKE '84%'
      THEN regexp_replace(sdt, '[^0-9]', '', 'g')
    ELSE '84' || regexp_replace(sdt, '[^0-9]', '', 'g')
  END
WHERE sdt_norm IS NULL AND sdt IS NOT NULL AND regexp_replace(sdt, '[^0-9]', '', 'g') <> '';

ALTER TABLE don_hang ENABLE ROW LEVEL SECURITY;
