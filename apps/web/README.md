# Web (React)

Vite + React 19 + Tailwind v4, same stack as `apps/desktop`, sharing all
page/component/state code via `@stm/app-core` (Phase 33) — no UI or
business logic is duplicated between the two apps.

## Chạy local

```bash
npm run dev --workspace=apps/web
```

Mặc định gọi backend tại `http://localhost:5277` (xem `.env.development`).
Nếu `apps/desktop` đang chạy dev server cùng lúc và chiếm cổng `5173`, Vite
sẽ tự chuyển `apps/web` sang `5174` — cổng này đã được thêm sẵn vào CORS
`Cors:AllowedOrigins` phía backend (`appsettings.Development.json`).

## Build

```bash
npm run build --workspace=apps/web
```

## Deploy lên Vercel

1. Kết nối repo GitHub với Vercel, tạo project mới.
2. Trong Project Settings → General → Root Directory, chọn `apps/web`.
3. Build Command: `cd ../.. && npm install && npm run build --workspace=apps/web`
   Output Directory: `dist`
   (Vercel tự nhận diện Vite qua `vite.config.ts` nếu Root Directory đúng;
   chỉ cần chỉnh Build Command thủ công vì đây là npm workspaces monorepo.)
4. Environment Variables → thêm `VITE_API_BASE_URL` = URL backend Railway
   thật (giá trị giống `.env.production` ở đây).
5. Sau khi deploy xong và có domain thật (vd. `https://smarttask.vercel.app`),
   thêm domain đó vào biến môi trường `Cors__AllowedOrigins__2` trên Railway
   (service `SmartTaskManagers`) — không cần sửa code hay deploy lại backend.
   Dùng index `2`, không phải `0`: base `appsettings.json` đã định nghĩa sẵn
   index `0`/`1` cho 2 origin Tauri (`tauri://localhost`/`http://tauri.localhost`),
   và ASP.NET Core's environment-variable config provider merge mảng **theo
   index** với layer bên dưới (base `appsettings.json`) chứ không append —
   dùng `__0` sẽ ghi đè mất origin Tauri đầu tiên thay vì thêm domain Vercel mới.

## Mobile (Android / iOS) — Phase 34

Dùng [Capacitor](https://capacitorjs.com) để đóng gói đúng bản web này (build
trong `dist/`) thành app native — không có code mobile riêng, cùng một
`packages/*` với Desktop/Web. `capacitor.config.ts` (`webDir: 'dist'`) là nơi
cấu hình duy nhất.

### Yêu cầu

- **Android**: Android Studio + Android SDK (biến môi trường `ANDROID_HOME`).
  Cần **JDK 21** để chạy Gradle build (không phải JDK 17 dùng cho backend
  ASP.NET Core hay .NET) — verified thật: build fail với lỗi
  `invalid source release: 21` khi `JAVA_HOME` trỏ vào JDK 17. Android Studio
  tự kèm theo JBR (JetBrains Runtime) là JDK 21 sẵn, thường ở
  `<Android Studio install dir>/jbr` — dùng biến đó làm `JAVA_HOME` khi build,
  không cần cài JDK riêng.
- **iOS**: chỉ build được trên **macOS** có Xcode + CocoaPods cài sẵn — không
  thể build/test trên Windows/Linux. Code trong `ios/` đã sẵn sàng, chỉ cần
  mở bằng Xcode trên máy Mac khi có.

### Lệnh

```bash
# Đồng bộ bản web mới nhất vào cả android/ và ios/ (build + cap sync)
npm run cap:sync --workspace=apps/web

# Mở project Android trong Android Studio (để chạy/debug/build từ IDE)
npm run android:open --workspace=apps/web

# Build + chạy trực tiếp lên thiết bị/emulator đang kết nối (cần `adb devices` thấy máy)
npm run android:run --workspace=apps/web

# Build file .apk debug thật, không cần mở Android Studio
# (Windows: set JAVA_HOME về JBR của Android Studio trước, ví dụ:)
JAVA_HOME="/d/Program Files/Android/Android Studio/jbr" npm run android:build-debug --workspace=apps/web
# → apps/web/android/app/build/outputs/apk/debug/app-debug.apk

# Mở project iOS trong Xcode (chỉ chạy được trên macOS)
npm run ios:open --workspace=apps/web
```

Sau khi có APK, cài thật lên emulator/thiết bị để verify (không chỉ tin vào
build thành công):

```bash
adb install -r apps/web/android/app/build/outputs/apk/debug/app-debug.apk
adb shell monkey -p com.smarttaskmanager.app -c android.intent.category.LAUNCHER 1
```

App dùng chung `VITE_API_BASE_URL` từ `.env.production` giống bản web/desktop
(build-time, trỏ vào Railway) — không cần cấu hình mạng gì thêm riêng cho
mobile.
