# 3. Kế hoạch

> Cập nhật: 2026-11-01. Đây là kế hoạch **đề xuất** dựa trên những gì còn dang dở trong repo và các
> trao đổi trong dự án. Thứ tự và ưu tiên do chủ dự án quyết định. Roadmap theo phase gốc nằm ở
> [`docs/roadmap/ROADMAP.md`](../roadmap/ROADMAP.md) (dừng ở Phase 34).

## 1. Việc cần chốt ngay (không cần viết thêm code)

| #   | Việc                                                                         | Ai làm    | Vì sao                                                            |
| --- | ---------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------- |
| 1.1 | Push `main` lên GitHub (còn các commit về giao diện điện thoại và Android)   | Chủ dự án | Codemagic và Hub đều đọc từ GitHub                                |
| 1.2 | Redeploy backend VoiceScribe trên Railway                                    | Chủ dự án | Cần CORS cho `https://localhost` thì APK mới gọi được API         |
| 1.3 | Build lại 3 APK trên Codemagic rồi thử trên điện thoại                       | Chủ dự án | Mã Java chưa từng biên dịch; vùng an toàn chưa thấy trên máy thật |
| 1.4 | Thử vai trò **Viewer** trên Content Manager sau khi Railway deploy bản 0.1.3 | Chủ dự án | Phân quyền mới chỉ kiểm chứng ở mức mã nguồn                      |
| 1.5 | Thử kéo thả Kanban và xuất CSV trên bản desktop Content Manager 0.1.3        | Chủ dự án | Hai lỗi này đã sửa nhưng chưa có xác nhận trên bản cài thật       |

## 2. Ngắn hạn (1-2 tuần)

| Hạng mục                                  | Nội dung                                                                                                                                                                | Ghi chú                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **Kiểm thử tự động**                      | Hiện **không có test** nào ngoài các tệp mẫu của Capacitor. Bắt đầu từ Smart Engine (C#), `RoleAccess` (Content Manager), `mergeSpeakers` và `validation` (VoiceScribe) | Rủi ro lớn nhất, xem bảng review |
| **Kiểm tra giao diện điện thoại thật**    | Chi tiết bản ghi VoiceScribe, các trang Content Manager, các trang còn lại của Smart Task Manager                                                                       | Mới đo ở trình duyệt             |
| **Ký APK và tạo bản release**             | Hiện chỉ có APK debug. Cần keystore riêng (chủ dự án giữ)                                                                                                               | Cần trước khi phát hành rộng     |
| **Hộp thoại xác nhận trên Tauri/Android** | Đã thay `window.confirm` bằng hộp thoại tự vẽ ở Smart Task Manager; kiểm tra trên bản cài thật                                                                          | Chỉ mới thử trên trình duyệt     |
| **Hub 0.1.1 (giao diện mới)**             | Chưa có GitHub Release                                                                                                                                                  | Chủ dự án đã hoãn                |
| **Chọn tiêu đề dự án trong CV**           | Đề xuất: "Smart Task Manager Suite: Cross-Platform Productivity Ecosystem"                                                                                              | Chủ dự án chưa chọn              |

## 3. Trung hạn (1-2 tháng)

| Hạng mục                          | Nội dung                                                                                                                                                                                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **iOS**                           | Smart Task Manager và Content Manager có workflow iOS nhưng chưa build thật; VoiceScribe chưa có nền tảng iOS. Cần máy Mac/Codemagic và chứng chỉ Apple. Ngoài ra phải xử lý vùng an toàn bên iOS (CSS đã sẵn, `MainActivity` chỉ dành cho Android) |
| **Cài đặt Smart Task Manager**    | Đã chia tab. Có thể thêm tìm kiếm cài đặt và đưa Tài khoản/Cài đặt về một chỗ                                                                                                                                                                       |
| **Hộp thư (Inbox)**               | Xem lại quy trình "ghi nhanh rồi sắp xếp"; chưa tìm thấy bước thừa rõ ràng nên chưa sửa                                                                                                                                                             |
| **Đồng bộ ngoại tuyến (offline)** | Chưa có. App cần mạng để dùng. Cân nhắc lưu đệm cục bộ                                                                                                                                                                                              |
| **Nâng Capacitor**                | Bản 8 có sẵn plugin vùng an toàn (SystemBars); sau khi nâng có thể bỏ mã `MainActivity` tự viết                                                                                                                                                     |
| **VoiceScribe**                   | Đã có ghi âm trực tiếp (2026-11-02, chưa thử máy thật). Còn lại: ép `language=vi` cho Whisper (cần thử với token thật vì chưa chắc nhà cung cấp nhận tham số), bước sửa chính tả/viết hoa bằng mô hình ngôn ngữ, thử trên Android và Tauri          |

## 4. Dài hạn

- Đăng nhập Google/Microsoft (Roadmap Phase 22 từng ghi "sau này").
- Thông báo đẩy (push) trên Android/iOS thay vì chỉ trong app.
- Màn hình Excel (`apps/excel`) đang đóng băng; quyết định giữ hay bỏ.
- Gộp ba hệ thống tài khoản (Smart Task Manager, Content Manager, VoiceScribe) nếu muốn đăng nhập một lần.

## 5. Rủi ro đã biết

| Rủi ro                                                                                        | Mức  | Giảm thiểu                                 |
| --------------------------------------------------------------------------------------------- | ---- | ------------------------------------------ |
| Không có test tự động, mọi thay đổi chỉ kiểm bằng tay                                         | Cao  | Mục 2, hạng mục kiểm thử                   |
| Mã Android tự viết chưa biên dịch                                                             | Vừa  | Build Codemagic và xem log                 |
| Hub và `apps/hub/src/data/apps.ts` phải sửa đồng bộ với `apps-manifest.json`, dễ quên một nơi | Vừa  | Làm theo quy trình phát hành ở tài liệu 02 |
| Một tệp `Cargo.lock`/`package-lock.json` đổi lớn khi nâng phụ thuộc                           | Thấp | Commit riêng                               |
| Dịch vụ Hugging Face thay đổi giới hạn/giá                                                    | Vừa  | Theo dõi; cân nhắc chạy mô hình riêng      |
