# Hướng dẫn sử dụng Tiệm CRM

Tài liệu này đi theo **từng màn hình**, theo đúng thứ tự trên thanh menu bên trái.
Phần cài đặt (dựng Supabase, deploy web, cắm cầu nối Zalo) nằm ở [README](../README.md) — ở đây
chỉ nói **dùng hằng ngày thì bấm vào đâu**.

Mở trên điện thoại cũng được: menu dọc thu lại thành thanh tab ở đáy màn hình.

---

## 0. Đăng nhập

Vào địa chỉ web của tiệm, nhập email + mật khẩu do người quản lý tạo.

Có **hai vai**:

| Vai | Thấy gì |
|---|---|
| `quan-ly` (chủ tiệm) | tất cả — mọi nick Zalo, mọi đơn, mọi cài đặt |
| `nhan-vien` (thợ, lễ tân) | chỉ hộp thư của nick Zalo mình cầm; vẫn ghi lịch và ghi đơn bình thường |

Phân quyền gác ở **cả trang lẫn đường dữ liệu**, không phải chỉ ẩn nút đi.

---

## 1. Tổng quan

Màn đầu tiên sau khi đăng nhập. Ba thứ cần nhìn:

- **Khách đang chờ trả lời** — khách nói câu cuối mà chưa ai đáp. Đây là con số nên về 0 mỗi tối.
- **Chờ trong tuần** tách riêng khỏi **tồn đọng 30 ngày**. Cố ý tách: khách chờ 2 ngày là việc
  làm hôm nay, khách tồn 3 tuần là chuyện khác. Dồn chung rồi dán "99+" thì cả tiệm sẽ lờ đi.
- **Tuổi kho** — kho dữ liệu cập nhật tới lúc nào. Nếu thấy *"kho đang cũ"* thì **máy chạy cầu nối
  Zalo đang tắt hoặc mất mạng**, con số trên màn là số cũ chứ không phải khách ngừng nhắn.

---

## 2. Lịch hẹn

Màn dùng nhiều nhất trong ngày.

**Xem lịch.** Mỗi thợ một cột. Ô hẹn cao đúng theo số phút của dịch vụ, nên nhìn một cái là thấy
chỗ trống nằm ở đâu. Bấm 7 nút ngày phía trên để nhảy nhanh, hoặc chọn ngày bất kỳ.

**Thêm hẹn.** Bấm **+**, chọn thợ → dịch vụ → giờ → nhập tên và số điện thoại khách.
Thời lượng tự lấy theo dịch vụ, không phải gõ tay.

**Không thể xếp trùng giờ.** Nếu giờ đó thợ đã có khách, hệ thống **từ chối ở tầng cơ sở dữ liệu**
chứ không phải ở màn hình — nên kể cả hai người cùng bấm một lúc (một người ở quầy, một khách đặt
qua web) cũng không bao giờ lọt hai khách vào một chỗ.

**Trạng thái mỗi hẹn**, bấm vào ô hẹn để đổi:

| Trạng thái | Nghĩa | Chỗ đó có nhả ra không |
|---|---|---|
| Đã đặt | khách hẹn, chưa tới | giữ chỗ |
| Đã đến | khách tới rồi | giữ chỗ |
| Vắng | khách không tới | **vẫn giữ chỗ** — để cuối tháng còn đếm được tỉ lệ bỏ hẹn |
| Huỷ | huỷ hẹn | **nhả chỗ**, người khác đặt được ngay |

**Xong một khách** thì bấm **Xong** — hệ thống tự ghi thành một đơn hàng, giá lấy theo dịch vụ.
Bấm hai lần cũng chỉ ra một đơn.

**Nhắc lịch ngày mai.** Khối "Cần nhắc" liệt kê khách có hẹn mai, mỗi người kèm **tin soạn sẵn**.
Bấm **Chép** rồi dán vào Zalo gửi khách. Nhắc xong đánh dấu một lần cho cả danh sách.

**Tỉ lệ khách đến** đo trên số hẹn đã tới hạn. Chưa có hẹn nào tới hạn thì nó ghi *"chưa đo được"*
chứ **không hiện 0%** — hai chuyện đó khác nhau.

---

## 3. Đơn hàng

**Ghi đơn.** Bấm **Ghi đơn**, nhập số điện thoại khách + số tiền. Những ô khác (tên, món, người
bán, ghi chú) có thì tốt, không có cũng lưu được.

**Gõ tiền kiểu bình thường**: `500k` · `1tr2` · `1,5 triệu` · `1.500.000` đều hiểu.
Lưu ý một điểm: **số trần là số đúng như gõ** — gõ `350` nghĩa là **350 đồng**, hệ thống
*không tự hiểu* thành 350 nghìn. Ngay dưới ô luôn in lại số nó vừa hiểu (`= 350 đ`), nhìn dòng đó
trước khi bấm lưu. Làm vậy là cố ý: đoán hộ thì có ngày lệch sổ mà không ai biết vì sao.

**Sửa đơn.** Bấm vào dòng đơn (trên điện thoại thì chạm vào dòng).

**Đơn có nhãn "từ lịch"** là đơn do màn Lịch hẹn tự sinh. Sửa nội dung được, nhưng **không xoá
được** — muốn bỏ hẳn thì vào Lịch hẹn huỷ cái hẹn tương ứng.

**Tổng kết tháng** ở bốn ô trên cùng: số đơn (tách rõ *từ lịch* / *ghi tay*), doanh thu, giỏ trung
bình, số khách thật (đếm theo số điện thoại, một khách mua 3 lần vẫn là 1 khách).

Đổi tháng bằng hai mũi tên hoặc ô chọn tháng. Ô tìm lọc theo tên khách, đuôi số điện thoại,
tên món hoặc người bán.

---

## 4. Khách hàng

Danh sách toàn bộ khách đã nhắn Zalo, kèm **thẻ tự gắn theo đơn hàng thật**:

- **VIP** — từ 3 đơn hoặc từ 5 triệu
- **Mua lại** — từ 2 đơn
- **Đã mua** — 1 đơn

Thẻ suy ra từ bảng đơn hàng, **không phải cờ ai đó bấm tay** — cờ bấm tay luôn thiếu và luôn trễ.
Ghi đơn đều thì thẻ tự đúng.

Còn có **điểm nóng** (0–100) chấm theo tín hiệu mua hàng và mức độ trò chuyện, **kèm lý do từng
điểm** để biết vì sao khách này được xếp cao. Không dùng AI, không tốn phí.

---

## 5. Tin nhắn Zalo

Hộp thư ba cột: **danh sách hội thoại · khung chat · hồ sơ khách**. Kéo mép cột để chỉnh bề rộng.

- Trả lời khách ngay trong này, tin đi thẳng ra Zalo.
- Mỗi tin trước khi gửi đều qua **cửa từ cấm** (danh sách bạn tự khai, xem mục 10). Dính từ thì bị
  chặn kèm danh sách từ để bạn tự sửa — hệ thống **không** tự thay từ hộ.
- Khách nhắn câu cuối mà chưa ai đáp thì hội thoại nằm trong tab **Chờ trả lời**.
- **Tin khách đã thu hồi vẫn đọc được**, có nhãn "đã thu hồi lúc…".
- Cột hồ sơ bên phải có nút nhanh: ghi lượt chăm, ghi cuộc gọi, ghi tặng quà, tạo việc — và
  **dòng thời gian** mọi việc đã làm với khách này.

> Nhân viên chỉ thấy hộp thư của nick mình cầm. Đây là cố ý: khách nhắn vào nick ai thì người đó
> chăm, đẩy qua đẩy lại chỉ làm khách rơi vào khoảng không.

---

## 6. Tin nhắn Facebook

Hộp thư của fanpage, trả lời thẳng từ đây, không phải mở Business Suite.

**Đồng hồ 24 giờ** là thứ phải để ý. Messenger chỉ cho nhắn lại **trong 24 giờ kể từ tin cuối của
khách** — quá giờ là Facebook chặn, không phải app hỏng. Mỗi hội thoại hiện sẵn "còn 3 giờ", và
hết giờ thì ô soạn khoá lại luôn.

Nên: **đừng để khách Facebook chờ qua đêm.**

---

## 7. Nhóm cộng đồng

Danh sách nhóm Zalo tiệm đang tham gia, kèm số thành viên theo ngày (nếu có máy đếm).
Dùng để theo dõi nhóm nào còn sống, nhóm nào đang rơi người.

---

## 8. Mẫu tin nhanh

Nơi soạn sẵn các câu hay dùng: báo giá, hướng dẫn đường đi, lời cảm ơn, lời xin lỗi vì trả lời muộn.
Soạn một lần, cả tiệm dùng chung, bấm **Chép** là dán được vào khung chat.

Mẫu tin cũng đi qua cửa từ cấm như tin thường.

---

## 9. Bot trả lời

**Mặc định TẮT.** Bật bằng công tắc trên màn này, không cần ai sửa code.

Bot trả lời được: **giá dịch vụ** (đọc từ bảng dịch vụ thật), **giờ mở cửa và địa chỉ**,
**giờ còn trống hôm nay / ngày mai** (đọc từ lịch thật), và **tra lịch hẹn của chính khách** theo
số điện thoại.

Phần quan trọng hơn là **khi nào nó im**:

- Khách nhắc tới **khiếu nại, hoàn tiền, luật sư, dị ứng, sưng, nhiễm trùng, đau** → bot im hoàn
  toàn, để người thật trả lời. Danh sách từ này sửa được ngay trên màn.
- Bot đáp **tối đa 2 lượt liên tiếp** (đổi được) rồi nhường người.
- **Không hiểu câu hỏi thì im**, không đoán bừa.
- Câu bot định nói mà dính **từ cấm** của ngành thì bị chặn trước khi gửi.
- Người thật vừa trả lời thì bot nghỉ, không chen ngang.

**Ô thử ngay trên màn**: gõ một câu bất kỳ, xem bot định đáp gì **và vì sao nó im** nếu nó im.
Thử vài câu khách hay hỏi trước khi bật cho khách thật.

---

## 10. Dịch vụ & thợ

Khai **một lần**, sau đó lịch hẹn và bot đều ăn theo:

- **Dịch vụ**: tên, **số phút**, giá. Số phút quyết định một ngày xếp được bao nhiêu khách —
  khai đúng thời gian thật, tính cả lúc dọn chỗ.
- **Thợ**: tên và màu hiển thị trên lịch.
- **Giờ mở cửa / đóng cửa**, bước chia khung giờ (15 hay 30 phút), tên tiệm hiện trên trang khách
  tự đặt, và công tắc **cho/không cho khách đặt qua web**.

Dưới cùng là **link trang đặt lịch** của tiệm. Bấm **Chép** rồi dán vào tiểu sử Facebook, Zalo,
hoặc nhắn cho khách.

### Trang khách tự đặt lịch

Khách mở link, **không cần đăng nhập, không cần tải app**: chọn dịch vụ → chọn thợ → chọn giờ còn
trống → để lại tên và số điện thoại. Hẹn hiện ngay trên lịch của tiệm.

Trang này **chỉ hiện giờ còn trống** — tuyệt đối không hiện tên hay số điện thoại của khách nào
khác. Lịch của tiệm là danh sách phụ nữ kèm giờ họ có mặt ở một địa chỉ, nên chỗ này được khoá kỹ.

---

## 11. Nối Facebook

Làm **một lần** lúc cài. Màn này hiện sẵn **Verify Token** và **địa chỉ webhook** để dán sang Meta.
Các bước đầy đủ nằm ở [README, mục Cài đặt](../README.md#5-nối-facebook-bỏ-qua-nếu-chỉ-dùng-zalo).

Token của page **không bao giờ hiện ra màn hình**, chỉ thấy 4 ký tự cuối.

---

## 12. Kết nối Zalo

Quản lý bấm **Lấy mã QR** → mã hiện trên màn hình → nhân viên **quét bằng Zalo trên điện thoại**.
Quét xong là tin nhắn và danh bạ của nick đó đổ về CRM.

Nick hiện **OFF** nghĩa là mất kết nối. Lý do hay gặp nhất: **nick đó vừa đăng nhập Zalo trên máy
tính khác** — Zalo chỉ cho một phiên máy tính mỗi nick. Quét QR lại là xong.

---

## Vài điều nên biết trước khi dùng thật

- **Cầu nối Zalo cần một máy luôn bật** (máy tính cũ để ở quầy là đủ). Máy tắt thì tin nhắn Zalo
  không về, và màn Tổng quan sẽ báo *"kho đang cũ"*.
- **Zalo không cho đọc ngược lịch sử.** Cầu nối chỉ nghe được tin **từ lúc nó bắt đầu chạy**, nên
  nối càng sớm thì kho càng đầy.
- **Hệ thống nói thật khi hỏng.** Thấy chữ "chưa đo được", "kho đang cũ", hay một dải báo đỏ thì
  đó là nó đang báo *dữ liệu không đáng tin*, chứ không phải *hôm nay không có khách*. Hai chuyện
  này cố ý được phân biệt ở mọi màn hình.
- **Dùng nick Zalo phụ / hotline của tiệm**, đừng dùng nick cá nhân quan trọng — xem mục RỦI RO
  trong [README](../README.md#rủi-ro--đọc-trước-khi-dùng).
