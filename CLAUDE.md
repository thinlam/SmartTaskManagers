# Hướng dẫn cho Claude trong repo này

Trả lời **tiếng Việt, ngắn gọn, trung thực** về cái đã và chưa kiểm chứng. Quy tắc đầy đủ của dự án nằm ở
[`docs/project/05-quy-tac-du-an.md`](docs/project/05-quy-tac-du-an.md); tài liệu tổng thể ở
[`docs/project/README.md`](docs/project/README.md).

## Quy tắc bắt buộc: mỗi lần làm việc phải cập nhật docs

Sau **mọi** lần làm xong một việc có thay đổi trong repo (code, cấu hình, build, phát hành, sửa lỗi,
quyết định kiến trúc), **trước khi báo hoàn thành**, phải cập nhật tài liệu trong `docs/project/` để ghi lại
đã làm gì. Không để tài liệu lệch so với repo.

### Luôn làm

1. **`docs/project/04-nhat-ky-da-lam.md`:** thêm một dòng vào đúng mục tháng/ngày hiện tại (dùng **ngày thật** của
   phiên làm việc, định dạng `YYYY-MM-DD`). Mỗi dòng nêu:
   - **Làm gì** (một câu, nói kết quả chứ không nói công cụ).
   - **Mã commit** nếu đã commit (`abc1234`); nếu chưa commit thì ghi "chưa commit".
   - **Đã kiểm chứng gì / chưa kiểm chứng gì** (ví dụ: "typecheck sạch, chưa thử trên điện thoại").
   - Nếu là phát hành: phiên bản, tag, SHA-256 đã đối chiếu.

### Làm thêm khi liên quan

| Khi                                                                 | Cập nhật thêm                                                     |
| ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Đổi hành vi nghiệp vụ, màn hình, vai trò, quy tắc tính toán         | `01-nghiep-vu.md`                                                 |
| Đổi cách build, deploy, biến môi trường, quy trình phát hành        | `02-van-hanh.md` (chỉ ghi **tên** biến, không ghi giá trị bí mật) |
| Xong một việc có trong kế hoạch, hoặc phát sinh việc mới/rủi ro     | `03-ke-hoach.md` (đánh dấu xong hoặc thêm dòng mới)               |
| Thêm quy tắc mới hoặc rút ra bài học làm việc                       | `05-quy-tac-du-an.md`                                             |
| Sửa/đóng một phát hành F1…F13, hoặc phát hiện vấn đề mới trong code | `06-review-source.md` (cập nhật trạng thái, ngày, commit)         |
| Phát hành bản mới                                                   | Thêm vào bảng "Phiên bản đã phát hành" ở `04`                     |

### Cách làm

- Sửa tài liệu **cùng lượt** với code, không để "làm sau". Nếu người dùng yêu cầu commit, đưa thay đổi docs vào
  **cùng commit** với code đó (hoặc commit `docs:` ngay sau), để lịch sử khớp.
- Ghi **sự thật đã xảy ra**, không ghi điều dự định. Việc chưa chạy thật thì ghi "chưa kiểm chứng".
- Giữ nguyên văn phong và định dạng bảng hiện có. Chạy `npx prettier --write` **chỉ trên các tệp docs đã sửa**.
- Cập nhật dòng "Cập nhật:" ở đầu tài liệu đã sửa.
- Nếu việc vừa làm quá nhỏ (chỉ trả lời câu hỏi, không đổi gì trong repo) thì không cần sửa docs.
- Nếu không chắc tài liệu nào cần sửa, **sửa `04` rồi nêu rõ trong câu trả lời** những tài liệu còn lại có thể cần cập nhật.

### Trong câu trả lời cuối

Nói rõ **đã cập nhật những tệp docs nào**, và nếu bỏ qua tệp nào thì vì sao.

## Quy tắc bắt buộc: mỗi nghiệp vụ/tính năng mới phải có file kế hoạch riêng, làm theo đúng 3 bước

Áp dụng cho **nghiệp vụ hoặc tính năng mới, hoặc sửa một luồng nghiệp vụ có sẵn** (không áp dụng cho việc
sửa lỗi nhỏ, đổi config, hay trả lời câu hỏi không đổi gì trong repo).

### Bước 1 — Đưa ra plan TRƯỚC khi đụng code

Trước khi viết code, phải đọc kỹ yêu cầu của người dùng, **hiểu đúng theo nghiệp vụ thật** của họ (không
suy diễn máy móc theo câu chữ nếu điều đó đi ngược nghiệp vụ), rồi tạo file kế hoạch tại
`docs/project/plans/YYYY-MM-DD-<ten-ngan>.md` gồm các mục:

- **Mục tiêu / nghiệp vụ**: tính năng/việc sửa này giải quyết vấn đề gì, cho ai dùng, hiểu theo đúng ý
  nghiệp vụ của người dùng (nếu yêu cầu có điểm chưa rõ hoặc có thể hiểu nhiều cách, nêu rõ cách hiểu đã
  chọn và vì sao).
- **Phạm vi**: những gì làm, những gì rõ ràng KHÔNG làm trong lần này.
- **Hướng đi / cách làm hoặc cách sửa**: phương án đúng chuẩn theo nghiệp vụ (không chỉ đúng theo chữ
  nghĩa yêu cầu) — các file/module sẽ đổi, luồng dữ liệu, có đổi backend/schema không.
- **Rủi ro**: trình bày dạng bảng 3 cột `Rủi ro | Mức | Giảm thiểu` (Mức: Thấp/Trung bình/Cao/Không có).
- **Kiểm chứng**: dự kiến chạy test/kiểm tra gì để coi là xong (typecheck, test, chạy thật trên trình
  duyệt...).

Nếu việc đủ lớn hoặc có điểm chưa chắc về nghiệp vụ, trình bày plan này cho người dùng duyệt trước khi
sang Bước 2. Nếu không chắc có cần file kế hoạch hay không, hỏi người dùng.

### Bước 2 — Code phải bám theo plan đã viết

Khi code, phải đối chiếu lại đúng file kế hoạch ở Bước 1 (không code tùy ý khác hướng đã chốt). Nếu
trong lúc code phát hiện hướng đã chốt không ổn hoặc cần đổi, **sửa lại file kế hoạch đó trước**, nêu rõ
vì sao đổi, rồi mới tiếp tục code theo hướng mới.

### Bước 3 — Xong phải test và ghi kết quả thật vào plan

Sau khi code xong, phải chạy kiểm chứng thật (typecheck/build/test/chạy thử UI tùy việc) rồi cập nhật lại
**chính file kế hoạch đó** (không tạo file mới) với phần "Kết quả thật": mục nào đã làm, mục nào bỏ/đổi so
với dự kiến, và **kết quả kiểm chứng thật** (không ghi điều dự định). Việc này làm **thêm vào**, không
thay thế, các cập nhật bắt buộc ở mục "cập nhật docs" phía trên (`04-nhat-ky-da-lam.md` vẫn phải cập nhật
như cũ, có thể trỏ về file kế hoạch tương ứng).

Không báo "đã xong" với người dùng nếu chưa hoàn tất cả 3 bước trên.

## Quy tắc bắt buộc: "build" nghĩa là bump version mới rồi build cả web app và Tauri

Khi người dùng gõ **"build"** (không kèm chi tiết khác) cho app desktop (ví dụ Smart Task Manager), hiểu là
yêu cầu ra **bản mới**, không phải chỉ build lại bản hiện tại. Phải làm theo thứ tự:

1. **Bump version** lên patch kế tiếp (ví dụ `0.1.3` → `0.1.4`) ở cả `apps/desktop/src-tauri/tauri.conf.json`
   và `apps/desktop/src-tauri/Cargo.toml` (và app tương ứng nếu không phải Smart Task Manager). Nếu người
   dùng nói rõ muốn bump minor/major (`0.2.0`, `1.0.0`) thì theo đúng ý đó thay vì patch mặc định. Nếu
   không rõ ràng việc này có nên bump minor/major hay không, hỏi lại trước khi làm.
2. **Build web app** trước (`npm run build:web` hoặc `npm run build --workspace=apps/desktop` tùy app) để
   bắt lỗi typecheck/build sớm, rẻ hơn build Tauri.
3. **Build Tauri thật** ra `.exe`/`.msi` (`npm run tauri -- build` trong thư mục app, hoặc lệnh tương đương)
   — không chỉ build web rồi báo xong; phải thấy file cài đặt thật được tạo ra.
4. Ghi lại version mới, kích thước file, và SHA-256 (nếu tính được) vào `docs/project/04-nhat-ky-da-lam.md`
   theo đúng quy tắc docs ở trên.

5. Sau khi có `.exe`/`.msi` thật và đã ghi version/hash vào docs, **tạo git tag** theo đúng version (ví dụ
   `smart-task-manager_0.1.4`), rồi **hỏi xác nhận ngắn** (phiên bản, tên file, SHA-256) trước khi
   `gh release create` kèm 2 file đó lên GitHub. Chỉ tạo Release thật sau khi người dùng xác nhận câu hỏi
   đó — không tự tạo im lặng.

Deploy lên Railway (cho web/API) vẫn do chủ dự án làm, không nằm trong rule này.

## Quy tắc bắt buộc: "build lại" khác "build"

"Build lại" (đổi máy làm việc, cần dựng lại đúng artifact máy kia đã build) **không phải** rule "build" ở
trên. "Build lại" = build ra đúng bản hiện có (**không** bump version, không tạo release mới) để tiếp tục
làm việc trên máy mới. Chỉ khi người dùng gõ đúng "build" (không có "lại") mới áp dụng quy trình bump
version + release ở trên.

## Quy tắc bắt buộc: commit thì push luôn; xung đột push/pull chọn bản đã push trước

- Khi người dùng bảo **commit** (hoặc trợ lý tự commit vì lý do khác, ví dụ cập nhật docs), **ngay sau khi
  commit thành công, luôn chạy `git push` trong cùng lượt làm việc** — không đợi người dùng nói "push" riêng,
  không hỏi lại xác nhận, không để lại tác vụ "chờ push" cho lần sau. Đây là **bước cuối bắt buộc của mọi
  lần commit**, coi như một phần của hành động "commit" chứ không phải việc tùy chọn tiếp theo — nhớ làm
  luôn, đừng quên. Chỉ ngoại lệ khi người dùng rõ ràng nói "đừng push"/"chưa push" cho riêng commit đó.
- Khi đổi máy làm việc (ví dụ máy cũ chưa push, máy mới sửa y chang rồi đã push), nếu push/pull bị xung đột
  (conflict): **luôn chọn bản đã push lên remote trước đó**, bỏ bản local chưa từng push của máy đang
  thao tác, dù máy đang thao tác là máy "mới" hay "cũ". Nếu không xác định được bản nào đã push trước, phải
  hỏi chủ dự án trước khi merge/reset, không tự chọn.

## Các thỏa thuận quan trọng khác (chi tiết ở tài liệu 05)

- Chỉ commit khi người dùng yêu cầu; khi commit thì push luôn theo rule ở trên.
- Không in hay chia sẻ bí mật (`HF_TOKEN`, `JWT_SECRET`, `SIGNUP_CODE`, chuỗi kết nối, khóa ký).
- Không sửa hay xóa dữ liệu trong cơ sở dữ liệu thật. Deploy lên Railway do chủ dự án làm. Tạo GitHub
  Release cho app desktop thì theo rule "build" ở trên (tự tạo sau khi hỏi xác nhận, không còn là việc
  chỉ chủ dự án làm).
- Không dùng `git stash` / `git stash pop` để thử nhanh (đã từng lấy nhầm stash của GitHub Desktop).
- Hub: sửa cả `apps-manifest.json` và `apps/hub/src/data/apps.ts` cùng lúc.
