/**
 * BÀI KIỂM cho phần tính toán của lịch hẹn (lib/lich.ts).
 *
 * Vì sao cần: ba lỗi nguy nhất ở đây — tính chồng giờ sai, quên loại lịch đã huỷ,
 * và cho đặt ca tràn qua giờ đóng cửa — đều KHÔNG gãy build, không ném lỗi, chỉ âm
 * thầm xếp hai khách vào một thợ. Bấm tay vài lần cũng không gặp.
 *
 * Chạy: npm run kiem
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const out = mkdtempSync(join(tmpdir(), "kiem-lich-"));
execFileSync("npx", ["tsc", "lib/lich.ts", "--outDir", out, "--module", "esnext", "--target", "es2020", "--skipLibCheck"], { stdio: "inherit" });
const L = await import(join(out, "lich.js"));
rmSync(out, { recursive: true, force: true });

let dat = 0, truot = 0;
const la = (ten, thuc, mong) => {
  const a = JSON.stringify(thuc), b = JSON.stringify(mong);
  if (a === b) { dat++; console.log(`  ok  ${ten}`); }
  else { truot++; console.log(`  X   ${ten}\n        ra:   ${a}\n        cần: ${b}`); }
};

const CD = { gioMo: 540, gioDong: 1200, buoc: 30, tenTiem: "T", choDatWeb: true, toiDaNgay: 30 };

console.log("\n-- đổi qua lại giờ --");
la("570 -> 09:30", L.hhmm(570), "09:30");
la("0 -> 00:00", L.hhmm(0), "00:00");
la('"09:30" -> 570', L.phutTu("09:30"), 570);
la('"00:00" -> 0 (KHÔNG phải null)', L.phutTu("00:00"), 0);
la('giờ bậy "25:00" -> null', L.phutTu("25:00"), null);
la('phút bậy "09:70" -> null', L.phutTu("09:70"), null);
la('rỗng -> null', L.phutTu(""), null);
la("90 phút đọc đẹp", L.phutDep(90), "1 tiếng 30 phút");
la("120 phút đọc đẹp", L.phutDep(120), "2 tiếng");
la("45 phút đọc đẹp", L.phutDep(45), "45 phút");

console.log("\n-- chồng giờ --");
la("trùng hẳn", L.chongNhau(540, 600, 540, 600), true);
la("lấn một nửa", L.chongNhau(540, 600, 570, 630), true);
la("bọc trọn", L.chongNhau(540, 700, 560, 600), true);
la("CHẠM đầu đuôi thì KHÔNG tính chồng", L.chongNhau(540, 600, 600, 660), false);
la("rời hẳn", L.chongNhau(540, 600, 660, 720), false);

console.log("\n-- chỗ trống --");
la("lịch trống, ca 60' -> bắt đầu đúng giờ mở",
  L.choTrong({ phut: 60, ban: [], caiDat: CD }).slice(0, 3), [540, 570, 600]);
la("ca phải XONG trước giờ đóng (1200), nên giờ cuối là 1140",
  L.choTrong({ phut: 60, ban: [], caiDat: CD }).slice(-1), [1140]);
la("ca 150' thì giờ cuối lùi về 1050",
  L.choTrong({ phut: 150, ban: [], caiDat: CD }).slice(-1), [1050]);
la("đã có khách 9:00-10:30 -> 9:00 và 10:00 biến mất, 10:30 còn",
  L.choTrong({ phut: 60, ban: [{ phutBd: 540, phut: 90, trangThai: "dat" }], caiDat: CD }).slice(0, 2), [630, 660]);
la("lịch ĐÃ HUỶ phải nhả chỗ ra",
  L.choTrong({ phut: 60, ban: [{ phutBd: 540, phut: 90, trangThai: "huy" }], caiDat: CD })[0], 540);
la("khách VẮNG vẫn giữ chỗ (thợ đã chờ mất giờ đó)",
  L.choTrong({ phut: 60, ban: [{ phutBd: 540, phut: 90, trangThai: "vang" }], caiDat: CD })[0], 630);
la("hôm nay, bây giờ 10:00 + đệm 30' -> sớm nhất 10:30",
  L.choTrong({ phut: 60, ban: [], caiDat: CD, bayGio: 600, demTruoc: 30 })[0], 630);
la("dịch vụ dài hơn cả ngày mở cửa -> không còn chỗ nào",
  L.choTrong({ phut: 999, ban: [], caiDat: CD }), []);
la("thời lượng 0 hoặc âm -> rỗng, không lặp vô tận",
  L.choTrong({ phut: 0, ban: [], caiDat: CD }), []);

console.log("\n-- tỷ lệ đến --");
la("3 đến / 1 vắng -> 75%, huỷ KHÔNG vào mẫu số",
  L.tyLeDen([{ trangThai: "den" }, { trangThai: "den" }, { trangThai: "den" }, { trangThai: "vang" }, { trangThai: "huy" }]).pct, 75);
la("chưa hẹn nào tới hạn -> null, KHÔNG phải 0%",
  L.tyLeDen([{ trangThai: "dat" }, { trangThai: "huy" }]).pct, null);
la("danh sách rỗng -> null", L.tyLeDen([]).pct, null);

console.log("\n-- tin nhắc khách --");
const tin = L.tinNhacLich({ khachTen: "Chị Lan", ngay: "2026-10-02", phutBd: 570, dichVuTen: "Sơn gel", thoTen: "Hà" }, "Tiệm A");
la("có tên khách", tin.includes("Chị Lan"), true);
la("ngày đọc kiểu Việt 02/10/2026", tin.includes("02/10/2026"), true);
la("có giờ", tin.includes("09:30"), true);
la("có tên tiệm", tin.includes("Tiệm A"), true);

console.log(`\n=> đạt ${dat} · trượt ${truot}`);
process.exit(truot ? 1 : 0);
