#!/usr/bin/env node
/**
 * TẠO NGƯỜI DÙNG CRM — chạy một lệnh, khỏi vào Supabase Dashboard.
 *
 *   node scripts/tao-nguoi-dung.mjs --email=an@congty.vn --mat-khau='MatKhauManh!' --ten="Nguyễn Văn An" --vai-tro=quan-ly
 *
 * Vai trò: quan-ly (thấy mọi nick) · nhan-vien (chỉ thấy nick mình cầm — mặc định).
 * LƯU Ý: `--ten` phải KHỚP với cột sale_name gắn trên nick Zalo (bảng zalo_bridge_accounts)
 * thì nhân viên mới thấy được hộp thư của mình.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import ws from "ws"; globalThis.WebSocket = ws;

const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(readFileSync(resolve(__dir, "../.env.local"), "utf8").split("\n").filter((l) => l && !l.startsWith("#")).map((l) => { const [k, ...r] = l.split("="); return [k.trim(), r.join("=").trim()]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const arg = (t) => (process.argv.find((a) => a.startsWith(`--${t}=`)) || "").split("=").slice(1).join("=");
const email = arg("email").trim();
const matKhau = arg("mat-khau");
const ten = arg("ten").trim();
const vaiTro = arg("vai-tro").trim() || "nhan-vien";

if (!email || !matKhau || !ten) {
  console.error('Cách dùng: node scripts/tao-nguoi-dung.mjs --email=... --mat-khau=... --ten="Họ Tên" [--vai-tro=quan-ly|nhan-vien]');
  process.exit(1);
}
if (!["quan-ly", "nhan-vien"].includes(vaiTro)) {
  console.error("--vai-tro chỉ nhận: quan-ly hoặc nhan-vien");
  process.exit(1);
}

const { data, error } = await sb.auth.admin.createUser({ email, password: matKhau, email_confirm: true });
if (error) { console.error("Không tạo được tài khoản:", error.message); process.exit(1); }

const { error: e2 } = await sb.from("nguoi_dung").upsert({ id: data.user.id, ho_ten: ten, vai_tro: vaiTro, active: true });
if (e2) { console.error("Tạo tài khoản rồi nhưng không ghi được hồ sơ:", e2.message); process.exit(1); }

console.log(`Đã tạo: ${email} · ${ten} · ${vaiTro}`);
console.log("Đăng nhập tại /login. Nhân viên cần được gán nick: điền sale_name của nick (bảng zalo_bridge_accounts) đúng bằng tên này.");
