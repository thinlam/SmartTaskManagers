# packages/api-client

`taskApi`, `projectApi`, `goalApi`, `habitApi`, `authApi` — component không tự gọi `fetch`.
Dùng `VITE_API_URL` qua biến môi trường, không hard-code URL trong component.
Chưa có code thật — dùng mock (`apps/desktop/src/mock`) cho đến **Phase 27** (Desktop ↔ Backend integration).
