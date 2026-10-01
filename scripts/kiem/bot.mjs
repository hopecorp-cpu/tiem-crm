/**
 * BÀI KIỂM cho phần THUẦN của bot + Facebook.
 *
 * Ba lỗi nguy nhất ở đây, và cả ba đều IM LẶNG:
 *  - dò từ khoá hỏng vì dấu tiếng Việt -> bot trả lời bừa câu lẽ ra phải nhường người;
 *  - từ khoá "người thật" (dị ứng, sưng, khiếu nại) không thắng các ý khác -> máy
 *    trả lời một khách đang đau;
 *  - tính cửa sổ 24 giờ sai -> lễ tân gõ xong cả đoạn mới biết Facebook chặn.
 *
 * Chạy: npm run kiem
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// bot.ts và facebook.ts có phần dính "server-only"/CSDL nên không nạp cả file được.
// Tách đúng hai hàm thuần cần kiểm ra một file tạm rồi biên dịch.
const src = await import("node:fs").then((fs) => fs.readFileSync("lib/bot.ts", "utf8"));
const lay = (ten, s) => {
  const i = s.indexOf(ten); if (i < 0) throw new Error("không thấy " + ten);
  let j = s.indexOf("\n}", i); return s.slice(i, j + 2);
};
const thuan = [
  lay("export function khongDau", src),
  src.slice(src.indexOf("const TU = {"), src.indexOf("export function doanYDinh")),
  lay("export function doanYDinh", src),
].join("\n\n")
  .replace(/: YDinh/g, "").replace(/: string\[\]/g, "").replace(/: string/g, "").replace(/: boolean/g, "");

const fb = await import("node:fs").then((fs) => fs.readFileSync("lib/facebook.ts", "utf8"));
const thuanFb = [
  "export const CUA_SO_GIO = 24;",
  lay("export function cuaSo", fb),
  lay("export function cheToken", fb),
].join("\n\n");

const out = mkdtempSync(join(tmpdir(), "kiem-bot-"));
writeFileSync(join(out, "b.ts"), thuan);
writeFileSync(join(out, "f.ts"), thuanFb);
execFileSync("npx", ["tsc", join(out, "b.ts"), join(out, "f.ts"), "--outDir", out, "--module", "esnext", "--target", "es2020", "--skipLibCheck"], { stdio: "inherit" });
const B = await import(join(out, "b.js"));
const F = await import(join(out, "f.js"));
rmSync(out, { recursive: true, force: true });

let dat = 0, truot = 0;
const la = (ten, thuc, mong) => {
  const a = JSON.stringify(thuc), b = JSON.stringify(mong);
  if (a === b) { dat++; console.log(`  ok  ${ten}`); }
  else { truot++; console.log(`  X   ${ten}\n        ra:   ${a}\n        cần: ${b}`); }
};

const NGUOI = ["khiếu nại", "hoàn tiền", "dị ứng", "sưng", "đau"];
const y = (t) => B.doanYDinh(t, NGUOI);

console.log("\n-- bỏ dấu tiếng Việt --");
la("đ phải thành d (NFD KHÔNG tách được đ)", B.khongDau("đặt lịch"), "dat lich");
la("Đ hoa cũng vậy", B.khongDau("ĐẶT"), "dat");
la("dấu mũ + thanh", B.khongDau("Bảng Giá Ở Đâu"), "bang gia o dau");

console.log("\n-- nhận ra khách hỏi gì --");
la("hỏi giá", y("bảng giá bao nhiêu ạ"), "gia");
la("hỏi giá không dấu", y("gia bao nhieu v shop"), "gia");
la("hỏi giờ", y("mấy giờ mở cửa"), "gio");
la("hỏi đường", y("tiệm ở đâu vậy"), "gio");
la("đặt lịch", y("chị muốn đặt lịch mai"), "dat-lich");
la("xem lịch của mình", y("kiểm tra lịch của tôi"), "lich-cua-toi");
la("chào", y("alo shop ơi"), "chao");
la("cảm ơn", y("cảm ơn em nhé"), "cam-on");
la("câu lạ -> không hiểu, bot sẽ im", y("hôm nay trời đẹp nhỉ anh thấy sao"), "khong-hieu");

console.log("\n-- từ khoá NGƯỜI THẬT phải THẮNG mọi ý khác --");
la("sưng -> người thật", y("làm xong bị sưng hết rồi"), "nguoi-that");
la("dị ứng kèm câu hỏi giá -> VẪN người thật", y("em bị dị ứng, cho hỏi giá làm lại bao nhiêu"), "nguoi-that");
la("hoàn tiền kèm 'đặt lịch' -> VẪN người thật", y("tôi muốn hoàn tiền chứ không đặt lịch nữa"), "nguoi-that");
la("khiếu nại không dấu cũng bắt được", y("toi muon khieu nai"), "nguoi-that");

console.log("\n-- cửa sổ 24 giờ của Messenger --");
const gio = (h) => new Date(Date.now() - h * 3600e3).toISOString();
la("khách nhắn 1 tiếng trước -> còn mở", F.cuaSo(gio(1)).conMo, true);
la("khách nhắn 23 tiếng trước -> còn mở", F.cuaSo(gio(23)).conMo, true);
la("khách nhắn 25 tiếng trước -> ĐÓNG", F.cuaSo(gio(25)).conMo, false);
la("chưa có tin của khách -> đóng, và conPhut null", [F.cuaSo(null).conMo, F.cuaSo(null).conPhut], [false, null]);
la("mốc rác -> đóng chứ không nổ", F.cuaSo("linh tinh").conMo, false);
la("còn ~23 tiếng thì conPhut quanh 1380", Math.abs(F.cuaSo(gio(1)).conPhut - 1380) <= 1, true);

console.log("\n-- che token --");
la("chỉ chừa 4 ký tự cuối", F.cheToken("EAAGabcdefghijklmnop1234"), "••••1234");
la("token ngắn -> che hết", F.cheToken("abc"), "••••");
la("rỗng -> che hết", F.cheToken(null), "••••");

console.log(`\n=> đạt ${dat} · trượt ${truot}`);
process.exit(truot ? 1 : 0);
