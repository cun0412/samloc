# Sâm Lốc Online (2 người)

## Chạy local
```bash
npm install
npm start
```
Mở `http://localhost:3000`.

---

## Deploy miễn phí để chơi qua Internet

### 1) Render (khuyên dùng)
Repo đã kèm `render.yaml` nên có thể deploy bằng Blueprint.

**Các bước:**
1. Push repo lên GitHub.
2. Vào Render → **New +** → **Blueprint**.
3. Chọn repo này và bấm **Apply**.
4. Đợi build xong, Render sẽ cấp URL dạng `https://samloc-online.onrender.com`.
5. Gửi URL cho bạn của bạn để chơi.

### 2) Railway
Repo đã kèm `railway.json`.

**Các bước:**
1. Push repo lên GitHub.
2. Vào Railway → **New Project** → **Deploy from GitHub repo**.
3. Chọn repo.
4. Railway tự đọc `railway.json` và chạy `npm start`.
5. Vào mục Networking để lấy public domain và chia sẻ cho bạn.

## Ghi chú
- WebSocket dùng cùng domain (`ws(s)://<host>`), nên chạy tốt trên Render/Railway mà không cần chỉnh client.
- Ứng dụng dùng cổng từ `PORT` env (phù hợp môi trường cloud).
