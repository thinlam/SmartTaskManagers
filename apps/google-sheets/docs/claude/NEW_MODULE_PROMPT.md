Bạn phải đọc trước:

1. docs/claude/UI_UX_MASTER_PROMPT.md
2. docs/claude/MODULE_PROMPTS.md
3. Source hiện tại của Smart Task Manager có liên quan đến module mới.

==================================================
NHIỆM VỤ
==================================================

Tôi muốn bạn THIẾT KẾ + IMPLEMENT một module HOÀN TOÀN MỚI cho:

SMART TASK MANAGER — PERSONAL MODE
Google Sheets + Google Apps Script

Module cần xây dựng:

[MODULE_NAME]

Hiện tại module này CHƯA TỒN TẠI hoặc chưa có implementation hoàn chỉnh.

Đây KHÔNG phải yêu cầu sửa giao diện có sẵn.

Bạn phải:

- phân tích kiến trúc hiện tại
- xác định source of truth
- xác định data model cần dùng
- xác định module dependencies
- xác định integration point
- thiết kế UX/UI
- thiết kế functions
- implement full code
- tích hợp menu nếu cần
- tích hợp refresh flow nếu cần
- tích hợp Settings nếu cần
- giữ toàn bộ hệ thống thống nhất với Smart Task Manager Design System

==================================================
I. TRƯỚC KHI CODE
==================================================

Trước tiên hãy kiểm tra source hiện tại:

- 00_Constants.gs
- 01_Utils.gs
- 02_Setup.gs
- 03_Data.gs
- 04_Menu.gs
- 05_SmartEngine.gs
- các module UI hiện có
- App Dialog
- Design System / UI helpers nếu đã tồn tại

Đồng thời kiểm tra data model:

Tasks
Projects
Goals
Habits
Settings
Lists
ActivityLog

Không được tự tạo model mới nếu model hiện tại đã đủ.

Không duplicate function.

Không phá function/module hiện tại.

Không đổi source of truth chỉ để làm UI dễ hơn.

==================================================
II. TRƯỚC KHI IMPLEMENT
==================================================

Hãy trình bày ngắn gọn:

1. Module này giải quyết vấn đề gì?
2. Người dùng sẽ sử dụng module như thế nào?
3. Dữ liệu lấy từ đâu?
4. Source of truth là sheet/entity nào?
5. File mới nào cần tạo?
6. File hiện tại nào cần sửa để tích hợp?
7. UI layout dự kiến như thế nào?
8. Những edge case nào cần xử lý?

Sau đó CODE NGAY.

Không dừng lại để chờ xác nhận trừ khi thực sự thiếu dữ liệu bắt buộc.

==================================================
III. UI/UX
==================================================

Giao diện phải tuân thủ toàn bộ:

docs/claude/UI_UX_MASTER_PROMPT.md

Đặc biệt:

- Professional
- Modern
- Clean
- Minimal
- Premium
- Clear hierarchy
- Desktop-first
- Consistent Design System
- Semantic colors
- Generous whitespace
- Reusable components
- Không giống Google Sheet được tô màu
- Nhìn giống productivity application thực tế

Các màn mới phải nhìn cùng một sản phẩm với:

Dashboard
Today
Tasks
Task Details
Quick Add
Kanban
Calendar
Timeline
Projects

==================================================
IV. PAGE STRUCTURE
==================================================

Nếu module có một full-page view, ưu tiên cấu trúc:

ROW 1
Accent line

ROW 2
Page Title + Context/Date

ROW 3
Subtitle

ROW 4
Smart Context / Health / Insight

ROW 5
Whitespace

ROW 6–8
4 KPI Cards tối đa

ROW 9
Whitespace

ROW 10+
Main Content

Nếu module phù hợp Sidebar thì KHÔNG ép thành sheet dashboard.

Nếu module phù hợp dialog thì dùng custom professional dialog.

Chọn UI pattern phù hợp với use case.

==================================================
V. DATA INTEGRITY
==================================================

Không tạo dữ liệu giả để làm đẹp UI.

Không render blank row thành entity thật.

Không match empty string với empty string như entity hợp lệ.

Không clear business data.

Không overwrite CRUD table chỉ để dựng view.

View = presentation.

Business sheets = source of truth.

==================================================
VI. IMPLEMENTATION QUALITY
==================================================

Code phải:

- production-style
- Apps Script compatible
- không placeholder
- không pseudo-code
- không TODO nếu có thể hoàn thiện
- có error handling
- có empty states
- có input validation
- có section comments
- có reusable helper nếu hợp lý
- tránh duplicate helper đã tồn tại

Nếu cần tạo nhiều file:

FILE 1
GHI FULL CODE

FILE 2
GHI FULL CODE

FILE 3
GHI FULL CODE

Nếu cần sửa file hiện tại cũng phải ghi FULL FILE hoặc chỉ rõ chính xác integration patch nếu file quá lớn và tôi yêu cầu patch.

==================================================
VII. INTEGRATION
==================================================

Nếu module cần menu:

cập nhật 04_Menu.gs.

Nếu module cần sheet:

cập nhật SHEETS / setupSmartTask() phù hợp.

Nếu module cần Settings:

seed Settings theo cách không overwrite cấu hình người dùng.

Nếu module cần dropdown:

tích hợp Lists.

Nếu module cần refresh:

tích hợp refreshViewsAfterTaskChange*() hoặc refreshAll*() nếu thực sự cần.

Không đưa module vào global refresh nếu việc đó gây chậm không cần thiết.

==================================================
VIII. FINAL REVIEW
==================================================

Trước khi hoàn thành tự kiểm tra:

- UI có đồng nhất Design System không?
- Có giống application thật không?
- Có quá nhiều màu không?
- Có rõ next action không?
- Có dữ liệu giả không?
- Có phá CRUD không?
- Có duplicate function không?
- Có blank entity bị render không?
- Có getRange width = 0 không?
- Có merge crossing frozen boundary không?
- Có empty state không?
- Có error handling không?
- Có menu/integration thiếu không?
- Có performance issue rõ ràng không?

Nếu chưa đạt thì tự chỉnh trước khi trả code.

==================================================
IX. OUTPUT
==================================================

Cuối cùng phải cung cấp:

1. Kiến trúc module
2. File mới
3. File cần cập nhật
4. FULL CODE
5. Lệnh:

clasp push

6. Các bước test chính xác trong Google Sheets.

Không chỉ mô tả.
Hãy IMPLEMENT HOÀN CHỈNH.
