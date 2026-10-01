import "server-only";
import { getServiceClient } from "@/lib/supabase-server";

/**
 * CỬA TỪ CẤM — mọi tin/mẫu tin đi ra khách đều soi qua đây trước khi gửi.
 *
 * Danh sách nằm ở config `tu_cam` (JSON: mảng chuỗi), sửa không cần deploy.
 * Mỗi ngành có luật riêng (thực phẩm bổ sung cấm "chữa bệnh/điều trị/thải độc",
 * tài chính cấm "cam kết lợi nhuận"...) nên bản mở này mặc định RỖNG — bạn tự khai
 * từ cấm của ngành mình. Ví dụ, ở SQL Editor:
 *
 *   INSERT INTO config (key, value, description)
 *   VALUES ('tu_cam', '["chữa bệnh", "điều trị", "cam kết 100%"]', 'từ cấm khi nhắn khách')
 *   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
 *
 * Khi tin dính từ cấm, route trả lỗi kèm danh sách từ để người sửa — KHÔNG tự thay
 * từ hộ (thay hộ là máy nói thay người).
 */

let _cache: { luc: number; ds: string[] } | null = null;

async function danhSachTuCam(): Promise<string[]> {
  if (_cache && Date.now() - _cache.luc < 60_000) return _cache.ds;
  let ds: string[] = [];
  try {
    const { data } = await getServiceClient().from("config").select("value").eq("key", "tu_cam").maybeSingle();
    const v = JSON.parse(data?.value || "[]");
    if (Array.isArray(v)) ds = v.map((x) => String(x).trim()).filter(Boolean);
  } catch { /* config hỏng khuôn thì coi như chưa khai — đừng chặn nhầm mọi tin */ }
  _cache = { luc: Date.now(), ds };
  return ds;
}

const boDau = (s: string) =>
  String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d").toLowerCase();

/** Trả về danh sách từ cấm tìm thấy trong đoạn chữ (so KHÔNG DẤU để "thai doc" vẫn bắt "thải độc"). */
export async function timTuCam(text: string): Promise<string[]> {
  const ds = await danhSachTuCam();
  if (!ds.length) return [];
  const t = boDau(text);
  return ds.filter((tu) => t.includes(boDau(tu)));
}
