/**
 * BÀI KIỂM MẢNG ĐƠN HÀNG — chạy: node scripts/kiem/don-hang.mjs
 *
 * Vì sao phải có: ba lỗi nguy nhất ở đây đều KHÔNG gãy build và KHÔNG ném lỗi —
 *  1. đọc nhầm số tiền ("1tr2" ra 1.000.002 thay vì 1.200.000) -> sổ sách lệch mà bảng vẫn đẹp;
 *  2. "không hiểu" bị trả thành 0 -> đơn ghi 0 đồng, nhìn như khách được tặng;
 *  3. giỏ trung bình trả 0 khi chưa có đơn -> đọc thành "bán ế" thay vì "chưa có số".
 */
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

// Biên dịch thẳng file gốc — nó cố ý KHÔNG nhập gì nên đứng một mình được.
// (Đừng cắt bớt khối `export type` bằng regex: chú thích kiểu còn lại sẽ trỏ vào khoảng không.)
const d = mkdtempSync(join(tmpdir(), "kiem-don-"));
const ts = join(d, "don-hang.ts");
writeFileSync(ts, readFileSync(new URL("../../lib/don-hang.ts", import.meta.url), "utf8"));
execFileSync("npx", ["tsc", ts, "--target", "es2020", "--module", "es2020",
  "--moduleResolution", "node", "--skipLibCheck", "--outDir", d], { stdio: "pipe" });
const M = await import(join(d, "don-hang.js"));

let dat = 0, truot = 0;
const la = (ten, thuc, mong) => {
  const ok = JSON.stringify(thuc) === JSON.stringify(mong);
  ok ? dat++ : truot++;
  console.log(`  ${ok ? "ok " : "x  "} ${ten}${ok ? "" : `\n        ra  : ${JSON.stringify(thuc)}\n        mong: ${JSON.stringify(mong)}`}`);
};

console.log("\n-- đọc số tiền chủ tiệm gõ tay --");
la("500k", M.docTien("500k"), 500000);
la("500K hoa", M.docTien("500K"), 500000);
la("500 nghìn", M.docTien("500 nghìn"), 500000);
la("500ng", M.docTien("500ng"), 500000);
la("1tr", M.docTien("1tr"), 1000000);
la("1tr2 = 1,2 triệu chứ KHÔNG phải 1.000.002", M.docTien("1tr2"), 1200000);
la("1tr25", M.docTien("1tr25"), 1250000);
la("2 triệu", M.docTien("2 triệu"), 2000000);
la("1,5tr", M.docTien("1,5tr"), 1500000);
la("1.5tr", M.docTien("1.5tr"), 1500000);
la("1.500.000 là phân nhóm", M.docTien("1.500.000"), 1500000);
la("1,500,000 là phân nhóm", M.docTien("1,500,000"), 1500000);
la("350000 trần", M.docTien("350000"), 350000);
la("350 trần = 350 đồng, KHÔNG đoán hộ thành 350k", M.docTien("350"), 350);
la("có chữ đ", M.docTien("250.000 đ"), 250000);
la("số 0 là số tiền hợp lệ", M.docTien("0"), 0);
la("số thật truyền vào", M.docTien(450000), 450000);
la("rỗng -> null chứ không phải 0", M.docTien(""), null);
la("chữ bậy -> null", M.docTien("abc"), null);
la("1.5.7 vô nghĩa -> null", M.docTien("1.5.7"), null);
la("âm -> null", M.docTien(-5), null);
la("1tr2x -> null, không đoán", M.docTien("1tr2x"), null);

console.log("\n-- danh sách món (hai đời dữ liệu) --");
la("mảng chuỗi", M.docSanPham(["Sơn gel", " Nối mi "]), ["Sơn gel", "Nối mi"]);
la("mảng object {ten}", M.docSanPham([{ ten: "Sơn gel" }]), ["Sơn gel"]);
la("lẫn lộn + rỗng", M.docSanPham(["A", { ten: "" }, null, "B"]), ["A", "B"]);
la("không phải mảng", M.docSanPham("A,B"), []);
la("tách ô nhập", M.tachMon(" Sơn gel , Nối mi ,, "), ["Sơn gel", "Nối mi"]);

console.log("\n-- khoảng tháng --");
la("tháng 31 ngày", M.khoangThang("2026-10"), { tu: "2026-10-01", den: "2026-10-31" });
la("tháng 30 ngày", M.khoangThang("2026-09"), { tu: "2026-09-01", den: "2026-09-30" });
la("tháng 2 năm thường", M.khoangThang("2026-02"), { tu: "2026-02-01", den: "2026-02-28" });
la("tháng 2 năm nhuận", M.khoangThang("2028-02"), { tu: "2028-02-01", den: "2028-02-29" });
la("tháng 13 -> null", M.khoangThang("2026-13"), null);
la("chuỗi bậy -> null", M.khoangThang("10-2026"), null);
la("lùi qua năm", M.luiThang("2026-01", -1), "2025-12");
la("tiến qua năm", M.luiThang("2026-12", 1), "2027-01");

console.log("\n-- tổng kết --");
const ds = [
  { id: "1", sdt: "0901234567", sdtNorm: "84901234567", khach: "Chị Lan", khachTra: 500000, ngay: "2026-10-01", sanPham: ["Sơn gel"], sale: null, ghiChu: null, tuLich: true, taoLuc: null },
  { id: "2", sdt: "0901234567", sdtNorm: "84901234567", khach: "Chị Lan", khachTra: 300000, ngay: "2026-10-02", sanPham: ["Dũa móng"], sale: null, ghiChu: null, tuLich: false, taoLuc: null },
  { id: "3", sdt: "0912000000", sdtNorm: "84912000000", khach: "Chị Hoa", khachTra: 1000000, ngay: "2026-10-02", sanPham: ["Nối mi"], sale: "Thu", ghiChu: null, tuLich: false, taoLuc: null },
];
const t = M.tongKet(ds);
la("số đơn", t.soDon, 3);
la("tổng tiền", t.tongTien, 1800000);
la("giỏ trung bình", t.giaTb, 600000);
la("đếm KHÁCH chứ không đếm đơn", t.soKhach, 2);
la("tách đơn từ lịch với đơn gõ tay", [t.tuLich, t.nhapTay], [1, 2]);
la("chưa có đơn thì giỏ TB là null, KHÔNG phải 0", M.tongKet([]).giaTb, null);
la("chưa có đơn thì tổng là 0", M.tongKet([]).tongTien, 0);

console.log("\n-- ô tìm --");
la("theo tên khách", M.loc(ds, "lan").length, 2);
la("không dính chữ hoa thường", M.loc(ds, "LAN").length, 2);
la("theo tên món", M.loc(ds, "nối mi").length, 1);
la("theo người bán", M.loc(ds, "thu").length, 1);
la("theo đuôi số điện thoại", M.loc(ds, "4567").length, 2);
la("số quá ngắn thì không lọc theo số", M.loc(ds, "90").length, 0);
la("ô tìm rỗng -> giữ nguyên", M.loc(ds, "  ").length, 3);

console.log("\n-- kiểm trước khi ghi --");
la("đủ thì qua", M.kiemDon({ sdt: "0901234567", khachTra: "500k", ngay: "2026-10-01" }), []);
la("thiếu số điện thoại", M.kiemDon({ sdt: "", khachTra: "500k" }), ["Thiếu số điện thoại khách"]);
la("tiền không đọc được", M.kiemDon({ sdt: "0901234567", khachTra: "nhiều" }), ["Số tiền không đọc được"]);
la("ngày sai định dạng", M.kiemDon({ sdt: "0901234567", khachTra: 0, ngay: "01/10/2026" }), ["Ngày sai định dạng"]);
la("tiền 0 vẫn hợp lệ (đơn tặng)", M.kiemDon({ sdt: "0901234567", khachTra: 0 }), []);

console.log(`\n=> đạt ${dat} · trượt ${truot}\n`);
process.exit(truot ? 1 : 0);
