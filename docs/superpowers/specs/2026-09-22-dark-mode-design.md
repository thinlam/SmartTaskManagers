# Dark Mode — Design

Ngày: 2026-09-22

## Bối cảnh

Hạng mục B trong 4 hạng mục được yêu cầu (A. i18n ✅ đã xong → B. Dark mode
→ C. Redesign Login/Register → D. Redesign Settings).

Khảo sát hiện trạng:
- `packages/ui/src/styles/theme.css` định nghĩa toàn bộ token màu qua
  Tailwind v4 `@theme` — chưa có palette dark nào (chỉ có 1 biến
  `--color-dark-header` sót lại, không liên quan).
- Component trong `packages/app-core`/`packages/ui` gần như 100% dùng
  class semantic (`bg-surface`, `text-ink-primary`, `border-border`...)
  thay vì hex cứng — chỉ 2 chỗ hex xuất hiện, cả 2 đều nằm trong comment,
  không phải code thật. Đây là điều kiện rất thuận lợi: thêm dark mode
  không cần sửa từng component, chỉ cần định nghĩa lại giá trị token.
- Không có field `Theme`/dark-mode nào trên `User` hay trong
  `SettingsContext` hiện tại.
- Component `Switch` đã có sẵn (`packages/ui/src/components/Switch`),
  dùng cho 4 toggle Smart Engine trong Settings — tái dùng được ngay,
  không cần tạo component mới.

## Mục tiêu

- Người dùng bật/tắt dark mode trong Settings, áp dụng ngay lập tức
  không cần reload.
- Lựa chọn lưu theo tài khoản User trên backend (giống ngôn ngữ) — đăng
  nhập máy khác vẫn giữ đúng theme đã chọn.
- Sửa 1 nơi (`theme.css` + `AuthContext`) thì cả `apps/desktop` lẫn
  `apps/web` cùng được áp dụng.

## Ngoài phạm vi

- Không thêm theme thứ 3 (vd. "system"/theo OS) — chỉ Light/Dark, mặc
  định Light cho user mới (quyết định đã chốt cùng người dùng).
- Không đặt toggle ở Topbar/Sidebar (`packages/ui`) — chỉ đặt trong
  Settings, cùng vị trí với Language, giữ phạm vi gọn như cách A đã làm.
  Thêm quick-toggle ở Topbar là việc có thể làm sau, không phải scope này.
- Không redesign giao diện Settings (hạng mục D riêng) — chỉ thêm 1
  Switch row mới, chưa cần đẹp.
- Không audit lại toàn bộ UI để tìm màu tương phản tối ưu cho từng
  trường hợp đặc biệt (biểu đồ, hình minh họa...) — chỉ định nghĩa lại
  token màu nền tảng (`background`/`surface`/`ink`/`border`), các token
  còn lại (`primary`, `success`, `danger`...) giữ nguyên vì đã đủ tương
  phản trên nền tối theo kiểm tra bằng mắt.

## Thiết kế

### B1. Backend — lưu `Theme` trên `User`

Y hệt pattern `Language` (Task 1 của hạng mục A), áp dụng cho field mới:
- `User.cs` thêm `public string Theme { get; set; } = "light";`
  (`"light"`/`"dark"`).
- `UserConfiguration.cs` thêm
  `builder.Property(u => u.Theme).HasMaxLength(5).IsRequired().HasDefaultValue("light");`
- Migration EF Core mới (`AddUserTheme`) — additive, default `"light"`
  cho user đã tồn tại.
- `AuthResult`/`AuthResponse` thêm field `Theme` (positional parameter
  cuối cùng, sau `Language` — không phá thứ tự tham số hiện có).
- `AuthService.RegisterAsync` không set `Theme` tường minh (dùng default
  entity `"light"`).
- Endpoint mới `PATCH /api/auth/theme` (`[Authorize]`), body
  `{ "theme": "light" | "dark" }`, validate chỉ nhận đúng 2 giá trị (400
  nếu khác), cập nhật `User.Theme`, trả `204 No Content`. Cùng
  `AuthController`, cùng cấu trúc `Guid.TryParse` → 401,
  `InvalidOperationException` → 404 (đã áp dụng cho endpoint Language ở
  fix wave cuối hạng mục A — theme dùng lại pattern đã hardening đó ngay
  từ đầu, không cần fix vòng 2).

### B2. Frontend — theme system

**`packages/ui/src/styles/theme.css`:**
- Thêm `@custom-variant dark (&:where(.dark, .dark *));` ở đầu file
  (trước khối `@theme`) — bật class-based dark mode cho Tailwind v4 thay
  vì mặc định theo `prefers-color-scheme`.
- Thêm khối `.dark { ... }` sau khối `@theme`, định nghĩa lại các token
  nền tảng bằng cùng tên biến (component không cần đổi class, chỉ giá
  trị biến đổi theo class `.dark` có mặt hay không trên `<html>`):
  ```css
  .dark {
    --color-background: #0f172a;
    --color-surface: #1e293b;
    --color-surface-secondary: #334155;
    --color-ink-primary: #f1f5f9;
    --color-ink-secondary: #cbd5e1;
    --color-ink-muted: #64748b;
    --color-border: #334155;
    --color-border-strong: #475569;
  }
  ```
  (`primary`/`success`/`warning`/`danger`/`info`/`status-*`/`priority-*`/
  `risk-*` giữ nguyên giá trị hiện tại — đã đủ tương phản trên nền tối.)

**`packages/app-core/src/state/AuthContext.tsx`** (mở rộng y hệt cách
`language` đã làm ở hạng mục A, rút kinh nghiệm bug đã sửa — viết
`persist()` ghi `stm.theme` vào localStorage ngay từ đầu, không để sót
như `stm.language` ban đầu):
- `StoredAuth` thêm field `theme`.
- `persist()` thêm `document.documentElement.classList.toggle('dark', next.theme === 'dark')`
  và `localStorage.setItem('stm.theme', next.theme)`.
- Hydrate `useEffect` gọi tương tự khi khôi phục session.
- `login`/`register` truyền `theme: result.theme` vào `persist()`.
- Thêm `setTheme(theme: 'light' | 'dark'): Promise<void>` — gọi
  `authApi.updateTheme(theme)` (thêm vào `packages/api-client/src/authApi.ts`,
  cùng dạng `updateLanguage`), rồi `persist({ ...auth, theme })`. Bọc
  try/catch quanh lời gọi API ngay từ đầu (không để lỗi bị nuốt âm thầm
  như `setLanguage` ban đầu).

**`packages/app-core/src/pages/Auth/LoginPage.tsx`:**
- `useEffect` đọc `localStorage.getItem('stm.theme')` trước khi có
  token, áp `document.documentElement.classList.toggle('dark', ...)` —
  cùng cơ chế fallback tạm như `stm.language`.

**`packages/app-core/src/pages/Settings/SettingsPage.tsx`:**
- Thêm 1 row `Switch` mới trong section "General", ngay dưới field
  Language: label "Dark Mode" (dịch qua i18n, namespace `settings` đã
  có sẵn từ hạng mục A), `checked={i18n... }` — thực ra đọc từ
  `document.documentElement.classList.contains('dark')` không phản ứng
  re-render tốt; thay vào đó đọc trực tiếp từ `useAuthContext()`'s theme
  state (cần expose `theme: string` ra context value, không chỉ hàm
  `setTheme`) để component re-render đúng khi đổi.
  `onCheckedChange={(checked) => void setTheme(checked ? 'dark' : 'light')}`.

**`AuthContextValue`** cần thêm field đọc được `theme: string | null`
(tương tự `email`), không chỉ hàm `setTheme` — vì Settings cần biết theme
hiện tại để hiển thị đúng trạng thái Switch.

## Rủi ro / lưu ý

- Tránh lặp lại đúng bug đã gặp ở hạng mục A (`stm.language` bị đọc mà
  không bao giờ được ghi) — thiết kế này viết `localStorage.setItem`
  ngay trong bước B2 đầu tiên, không tách thành fix riêng sau này.
- `document.documentElement.classList.toggle('dark', ...)` là side-effect
  DOM trực tiếp bên ngoài React state — chấp nhận được vì đây là pattern
  chuẩn cho Tailwind class-based dark mode, nhưng cần đảm bảo mọi nơi gọi
  `persist()` đều gọi đúng, không có đường tắt nào bỏ qua.
- Chỉ định nghĩa lại 8 token nền tảng cho dark — nếu sau này phát hiện
  màu nào chưa đủ tương phản (vd. `status-*`/`priority-*` trên nền tối),
  đó là việc tinh chỉnh riêng, không phải chặn hạng mục B này.
