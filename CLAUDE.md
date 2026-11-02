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

## Các thỏa thuận quan trọng khác (chi tiết ở tài liệu 05)

- Chỉ commit khi người dùng yêu cầu. Chỉ push sau khi người dùng nói rõ "push".
- Không in hay chia sẻ bí mật (`HF_TOKEN`, `JWT_SECRET`, `SIGNUP_CODE`, chuỗi kết nối, khóa ký).
- Không sửa hay xóa dữ liệu trong cơ sở dữ liệu thật. Việc trên Railway và tạo GitHub Release do chủ dự án làm.
- Không dùng `git stash` / `git stash pop` để thử nhanh (đã từng lấy nhầm stash của GitHub Desktop).
- Hub: sửa cả `apps-manifest.json` và `apps/hub/src/data/apps.ts` cùng lúc.
