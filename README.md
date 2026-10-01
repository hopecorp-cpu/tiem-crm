# Tiệm CRM

**Hệ quản lý khách cho tiệm dịch vụ** (nail, mi, spa, tóc…): chăm khách qua Zalo, hồ sơ khách, lịch hẹn, đơn hàng — chạy trên Next.js + Supabase, nối Zalo qua thư viện [zca-js](https://github.com/RFS-ADRENO/zca-js) (MIT).

Nền của bản này là CRM Zalo do [HOPE Corp](https://ikihealing.com) dựng và chạy thật cho đội sale chăm hơn 8.000 hội thoại Zalo.

## Đang có gì / còn thiếu gì

| Mảng | Trạng thái |
|---|---|
| Zalo: hộp thư 3 cột, gửi tin, nhiều nick, điểm nóng, nhãn, mẫu tin | **Chạy được** |
| Danh sách khách + thẻ VIP / Mua lại suy từ đơn thật | **Chạy được** |
| **Lịch hẹn**: thợ × khung giờ, dịch vụ nhiều thời lượng, khách tự đặt qua web | **Chạy được** |
| Đơn hàng | Lịch xong **tự sinh đơn**; chưa có màn nhập/sửa đơn tay |
| Tin nhắn Facebook / fanpage | **Chưa có** |
| Bot tư vấn tự động | **Chưa có** |

Hai mảng chưa có sẽ bổ sung theo đợt.

*(English summary at the bottom.)*

---

## Tính năng

- **Hộp thư ba cột**: danh sách hội thoại · khung chat · hồ sơ khách. Kéo chỉnh bề rộng cột, có bản mobile (thanh xanh + tab dưới) và nút xem thử bản điện thoại ngay trên desktop.
- **Gửi tin từ web**: tin đi qua **cửa từ cấm** (danh sách từ cấm của ngành bạn, khai trong config) rồi mới tới khách; hiện trạng thái "đang gửi / gửi hỏng" thật.
- **Nhiều nick Zalo, phân quyền theo người cầm**: quản lý thấy tất cả; nhân viên chỉ thấy hộp thư của nick mình cầm — gác ở CẢ trang lẫn API, không chỉ ẩn nút.
- **Tab "Chờ trong tuần" tách khỏi tồn đọng**: khách chờ ≤7 ngày là việc hôm nay; tồn 30 ngày là con số khác — không dán "99+" lên rồi cả đội lờ đi.
- **Điểm nóng (lead scoring) 0 đồng**: chấm tất định từ tín hiệu mua/sống/quan hệ, kèm LÝ DO từng điểm — không gọi mô hình AI nào.
- **Thẻ khách suy từ ĐƠN HÀNG THẬT** (VIP / Mua lại / Đã mua): đổ đơn của bạn vào bảng `don_hang` là thẻ tự hiện — không phải cờ ai đó bấm tay.
- **Nhãn + mẫu tin nhanh + hành động nhanh** (tạo việc, ghi lượt chăm/gọi/tặng quà) + **dòng thời gian hoạt động** của từng khách.
- **Tin thu hồi vẫn đọc được**: kho giữ nội dung gốc, hiện kèm nhãn "đã thu hồi lúc…".
- **Kết nối nick ngay trên web**: quản lý bấm "Lấy mã QR", mã hiện trên trang, nhân viên quét bằng điện thoại ở bất cứ đâu.
- **Nói thật khi hỏng**: tuổi kho hiện trên thanh trạng thái, nick mất kết nối gắn nhãn OFF — "kho đứng" và "khách không nhắn" là hai chuyện khác nhau và app phân biệt được.

## Lịch hẹn

- **Lịch ngày dạng cột**: mỗi thợ một cột, ô hẹn cao ĐÚNG theo số phút của dịch vụ — nhìn một cái thấy chỗ trống, không phải đọc danh sách rồi tự nhẩm.
- **Mỗi dịch vụ một thời lượng riêng** (sơn gel 60', nối mi 150'…). Không khoá cứng "mỗi ca 30 phút" như lịch hẹn thường thấy, vì khoá cứng thì hoặc chặn mất chỗ trống, hoặc xếp chồng hai khách.
- **Không thể trùng giờ — chặn ở tầng CSDL**, không phải ở tầng web. Hai người cùng bấm đặt một khung giờ thì kiểm bằng mã vẫn lọt; ràng buộc `EXCLUDE` của Postgres mới chặn được thật. Huỷ lịch thì nhả chỗ, khách vắng thì vẫn giữ chỗ (để cuối tháng còn đếm được tỷ lệ bỏ hẹn).
- **Khách tự đặt qua web** ở `/dat-lich` — không cần đăng nhập, không cần tải app. Dán link vào tiểu sử Facebook/Zalo. Trang này chỉ hiện GIỜ CÒN TRỐNG, tuyệt đối không hiện tên hay số của khách nào khác.
- **Xong một khách là sinh đơn hàng** vào bảng `don_hang` — nên thẻ VIP / Mua lại bên hộp thư Zalo tự hiện, hai mảng gặp nhau ở số điện thoại đã chuẩn hoá.
- **Nhắc lịch ngày mai**: danh sách khách cần nhắc + tin soạn sẵn, bấm Chép rồi dán vào Zalo. Nhắc xong đánh dấu một lần cho cả danh sách.
- **Tỷ lệ khách đến**: đo thật trên số hẹn đã tới hạn. Chưa có hẹn nào tới hạn thì ghi *"chưa đo được"*, KHÔNG hiện 0%.
- Giờ mở cửa, bước chia giờ, tên tiệm, bật/tắt đặt web: sửa trong app, không cần deploy lại.

Bài kiểm phần tính giờ: `npm run kiem` (31 ca — chồng giờ, nhả chỗ khi huỷ, ca tràn giờ đóng cửa, tỷ lệ đến). Ba lỗi nguy nhất ở đây đều không gãy build và không ném lỗi, nên phải có ca thử.

## Kiến trúc

```
Zalo  ⇄  scripts/zalo-bridge.mjs (zca-js — chạy trên MỘT MÁY LUÔN BẬT)
              │  nghe tin, danh bạ, thu hồi  ↓↑  gửi tin từ hàng đợi
              ▼
          Supabase (Postgres + Auth, RLS deny-all — chỉ server đọc)
              ▲
              │
          Next.js (web CRM — Vercel hoặc self-host)
```

Server web **không** nói chuyện thẳng với Zalo được, nên bắt buộc có một máy luôn bật (Mac/PC/VPS) chạy cầu nối. `scripts/zalo-cau-noi-quan-ly.mjs` giữ mỗi nick một tiến trình sống và nhận yêu cầu quét QR từ web.

## Luật xếp thư mục (đọc trước khi thêm mảng mới)

Mỗi mảng = **một thư mục `app/`, một file `lib/`, một file migration**. Phần dùng chung (đăng nhập, Supabase, hồ sơ khách) nằm ở lõi:

```
app/zalo/        lib/zalo-*.ts        supabase/002_zalo.sql
app/lich/        lib/lich.ts          supabase/004_lich.sql      (sẽ thêm)
app/don-hang/    lib/don-hang.ts      supabase/005_don-hang.sql  (sẽ thêm)
app/facebook/    lib/fb-*.ts          supabase/003_facebook.sql  (sẽ thêm)
app/bot/         lib/bot.ts
                 lib/auth.ts        ─┐
                 lib/supabase-*.ts   │  supabase/001_khoi_tao.sql  <- LÕI
                 lib/khach.ts       ─┘  (khách · người dùng · config)
```

**Một luật bắt buộc: mảng A cấm gọi thẳng vào ruột mảng B — chỉ được đi qua lõi.** Lịch cần biết khách là ai thì hỏi lõi, không đọc thẳng bảng của Zalo. Giữ được luật này thì sau muốn bóc riêng "chỉ lịch hẹn" là cắt một nhát ra được; phá luật thì ba tháng nữa muốn cắt phải mổ lại từ đầu.

## RỦI RO — đọc trước khi dùng

- **zca-js là thư viện KHÔNG chính thức**, mô phỏng Zalo Web bằng tài khoản Zalo **cá nhân**. Việc này có thể vi phạm điều khoản sử dụng của Zalo và **tài khoản có thể bị hạn chế hoặc khoá vĩnh viễn**. Cân nhắc dùng nick phụ/hotline thay vì nick cá nhân quan trọng. Dự án này không liên kết với Zalo/VNG; bạn tự chịu trách nhiệm khi dùng.
- **Zalo chỉ cho MỘT phiên máy tính mỗi nick** (điện thoại luôn giữ được). Nick đã nối vào CRM thì đừng mở Zalo PC/Web ở máy khác — mở là cầu bị đá ra (DuplicateConnection) và phải quét QR lại.
- **Nội dung chat + SĐT khách là dữ liệu cá nhân.** Schema đã bật RLS deny-all và app gác quyền hai lớp, nhưng bạn vẫn phải tự lo phần của mình: giữ kín `SUPABASE_SERVICE_ROLE_KEY`, file phiên `~/.zalo-crm-session-*.json` (tương đương mật khẩu Zalo, đã chmod 600), và tuân thủ pháp luật bảo vệ dữ liệu cá nhân nơi bạn hoạt động.

## Cài đặt

### 1. Supabase

1. Tạo project tại [supabase.com](https://supabase.com) (gói free đủ dùng).
2. Mở **SQL Editor** → dán toàn bộ [`supabase/001_khoi_tao.sql`](supabase/001_khoi_tao.sql) → Run.

Chạy tiếp `supabase/004_lich.sql` nếu muốn dùng lịch hẹn (cần quyền tạo extension `btree_gist` — Supabase cho sẵn).

### 2. Web

```bash
git clone https://github.com/hopecorp-cpu/zalo-crm.git
cd zalo-crm
cp .env.example .env.local   # điền 3 giá trị từ Supabase → Project Settings → API
npm install
npm run dev                  # http://localhost:3000
```

Deploy thật: đẩy lên Vercel (hoặc `npm run build && npm start` tự host), khai đủ 3 biến môi trường.

### 3. Tạo người dùng

```bash
node scripts/tao-nguoi-dung.mjs --email=admin@congty.vn --mat-khau='MatKhauManh!' --ten="Nguyễn Văn An" --vai-tro=quan-ly
```

Vai trò `quan-ly` thấy mọi nick; `nhan-vien` chỉ thấy nick mình cầm.

### 4. Cầu nối Zalo (trên máy luôn bật)

```bash
node scripts/zalo-cau-noi-quan-ly.mjs
```

Rồi vào web → **Kết nối Zalo** → gõ tên nick (ví dụ `hotline1`) → **Lấy mã QR** → quét bằng Zalo trên điện thoại. Từ đó tin nhắn + danh bạ đổ về CRM, và gửi tin từ CRM đi thẳng nick đó.

Giữ `zalo-cau-noi-quan-ly.mjs` chạy nền bằng pm2 / systemd / launchd, ví dụ với pm2:

```bash
pm2 start scripts/zalo-cau-noi-quan-ly.mjs --name zalo-cau-noi
```

### 5. Gán nick cho nhân viên

Trong Supabase → Table Editor → `zalo_bridge_accounts`: điền cột `sale_name` đúng bằng `ho_ten` của người đó trong bảng `nguoi_dung`. Quản lý không cần gán.

### 6. Tuỳ chọn

- **Thẻ khách theo đơn hàng**: đổ đơn của bạn vào bảng `don_hang` (sdt · khach · khach_tra · ngay · san_pham) — CRM tự gắn VIP/Mua lại/Đã mua và hiện lịch sử mua ở cột hồ sơ.
- **Từ cấm**: mỗi ngành có luật quảng cáo riêng. Khai một lần trong SQL Editor:
  ```sql
  INSERT INTO config (key, value, description)
  VALUES ('tu_cam', '["chữa bệnh", "điều trị", "cam kết 100%"]', 'từ cấm khi nhắn khách')
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  ```
  Mọi tin và mẫu tin đi ra khách đều bị soi (so không dấu); dính từ là bị chặn kèm danh sách từ để người sửa — app **không** tự thay từ hộ.
- **Số thành viên nhóm**: nếu bạn có máy đếm riêng, ghi vào bảng `zalo_group_snapshots` là trang Nhóm tự hiện số.

## Câu hỏi thường gặp

**Nick báo OFF dù không ai đụng gì?** Gần như chắc là nick vừa đăng nhập Zalo PC/Web ở máy khác nên cầu bị đá ra. Quét QR nối lại ở màn Kết nối Zalo.

**Sao không thấy tin nhắn cũ?** Cầu nối chỉ nghe được tin **từ lúc nó chạy trở đi** — Zalo không cho đọc ngược lịch sử. Nối càng sớm, kho càng đầy.

**"Kho đang cũ" nghĩa là gì?** Máy chạy cầu nối đang tắt hoặc mất mạng. Số trên màn hình vẫn là số cũ chứ không phải khách ngừng nhắn — app cố ý nói thẳng điều đó.

**Có đọc được tin nhắn của nhau không?** Nhân viên chỉ thấy nick mình cầm, gác ở cả trang lẫn API. Quản lý (`vai_tro = 'quan-ly'`) thấy tất cả.

## Phạm vi bàn giao

Bản này giao **mã nguồn**, không kèm vận hành. Cụ thể:

- Bạn tự tạo project Supabase, tự deploy web, tự cắm máy chạy cầu nối Zalo.
- Bạn tự giữ khoá, tự sao lưu dữ liệu, tự chịu trách nhiệm với dữ liệu khách của mình.
- Sửa thoải mái, không phải hỏi ai, không phải mở mã (giấy phép MIT).

Cần một máy luôn bật để chạy cầu nối Zalo — một máy tính cũ để ở quầy là đủ, không cần thuê máy chủ.


## Giấy phép

[MIT](LICENSE) © HOPE Corp (Công ty Cổ phần TMDV HOPE).

Nghĩa là: **muốn làm gì thì làm.** Sửa, đóng mã lại, đem bán, đổi tên — không phát sinh nghĩa vụ nào, chỉ cần giữ lại dòng bản quyền trong file `LICENSE`.

Một việc giấy phép không nói nhưng vẫn áp dụng theo luật nhãn hiệu: **đừng đặt tên sản phẩm của bạn là "HOPE" hay "IKI"** — đó là nhãn hiệu của HOPE Corp. Mã thì tự do, tên thì không.

Phần mềm giao nguyên trạng, **không bảo hành**.

---


## English summary

**Tiệm CRM** is a team inbox / CRM for Vietnamese businesses that sell and support customers over personal Zalo accounts (Zalo has no official API for personal accounts). Stack: Next.js + Supabase + [zca-js](https://github.com/RFS-ADRENO/zca-js). A bridge script on an always-on machine listens for messages and sends queued replies; the web app provides a three-pane team inbox with per-agent permissions, deterministic lead scoring, order-based customer badges, labels, message templates, and a configurable banned-words gate for regulated industries. **Warning:** zca-js is an unofficial API — accounts may be banned; use at your own risk. Licensed under the MIT License by HOPE Corp. Provided as is, without warranty.
