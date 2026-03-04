# 🎨 WOW ART Portal — Hướng dẫn Setup & Deploy

## Tổng quan
Portal quản lý WOW ART với Firebase Realtime Database.
- Admin + GV truy cập cùng 1 link
- Data đồng bộ real-time (Admin nhập → GV thấy ngay)
- Miễn phí hoàn toàn (Firebase free tier + Vercel free)

---

## BƯỚC 1: Tạo Firebase Project (10 phút)

### 1.1 Vào Firebase Console
- Mở trình duyệt → vào **https://console.firebase.google.com**
- Đăng nhập bằng tài khoản Google (dùng email WOW ART nếu có)

### 1.2 Tạo Project mới
- Bấm **"Create a project"** (hoặc "Add project")
- Đặt tên: `wowart-portal`
- Google Analytics: **tắt** (không cần) → Bấm **Create project**
- Chờ 30 giây → Bấm **Continue**

### 1.3 Tạo Web App
- Trong trang project, bấm biểu tượng **</>** (Web)
- Đặt tên app: `WOW ART Portal`
- **KHÔNG** tích "Firebase Hosting" 
- Bấm **Register app**
- Màn hình hiện ra đoạn code config → **COPY toàn bộ** phần `firebaseConfig` ra notepad
- Bấm **Continue to console**

Ví dụ config sẽ trông như thế này:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "wowart-portal.firebaseapp.com",
  databaseURL: "https://wowart-portal-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wowart-portal",
  storageBucket: "wowart-portal.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

### 1.4 Bật Realtime Database
- Menu bên trái → **Build** → **Realtime Database**
- Bấm **Create Database**
- Chọn location: **asia-southeast1 (Singapore)** ← quan trọng, gần VN nhất
- Security rules: chọn **Start in test mode** → Bấm **Enable**

### 1.5 Cập nhật Database Rules
- Trong Realtime Database → tab **Rules**
- Xóa hết, paste đoạn này:

```json
{
  "rules": {
    "wowart": {
      "data": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```
- Bấm **Publish**

> ⚠️ Rules này cho phép mọi người đọc/ghi. OK cho giai đoạn đầu. Sau này thêm authentication để bảo mật hơn.

---

## BƯỚC 2: Tạo GitHub Repository (5 phút)

### 2.1 Tạo tài khoản GitHub (nếu chưa có)
- Vào **https://github.com** → Sign up

### 2.2 Tạo Repository
- Bấm **"+"** góc trên phải → **New repository**
- Tên: `wowart-portal`
- Visibility: **Private** (giữ code riêng tư)
- **KHÔNG** tích "Add a README file"
- Bấm **Create repository**

### 2.3 Upload code
- Trong trang repo vừa tạo, bấm **"uploading an existing file"**
- Kéo thả **TOÀN BỘ** các file trong thư mục project vào:
  ```
  index.html
  package.json
  vite.config.js
  vercel.json
  .gitignore
  .env          ← file này bạn tạo ở bước 2.4
  src/main.jsx
  src/App.jsx
  src/firebase.js
  public/manifest.json
  ```
- Bấm **Commit changes**

### 2.4 Tạo file .env
- Copy file `.env.example` → đổi tên thành `.env`
- Điền config Firebase (từ bước 1.3) vào:

```env
VITE_FB_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxx
VITE_FB_AUTH_DOMAIN=wowart-portal.firebaseapp.com
VITE_FB_DB_URL=https://wowart-portal-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_FB_PROJECT_ID=wowart-portal
VITE_FB_STORAGE=wowart-portal.firebasestorage.app
VITE_FB_SENDER_ID=123456789012
VITE_FB_APP_ID=1:123456789012:web:abcdef123456
```

> ⚠️ **QUAN TRỌNG**: `VITE_FB_DB_URL` phải chứa `databaseURL` từ Firebase config. Nếu bước 1.3 không thấy databaseURL, vào **Realtime Database** → copy URL ở đầu trang (dạng https://xxx.firebasedatabase.app).

---

## BƯỚC 3: Deploy lên Vercel (5 phút)

### 3.1 Tạo tài khoản Vercel
- Vào **https://vercel.com** → **Sign Up** → **Continue with GitHub**
- Cho phép Vercel truy cập GitHub

### 3.2 Import Project
- Vercel Dashboard → **Add New...** → **Project**
- Tìm repo `wowart-portal` → Bấm **Import**

### 3.3 Cấu hình
- Framework Preset: **Vite** (tự detect)
- Root Directory: `.` (mặc định)
- **Environment Variables** ← QUAN TRỌNG:
  - Bấm **"Environment Variables"** mở ra
  - Thêm từng biến (copy từ file .env):
    ```
    VITE_FB_API_KEY = AIzaSyBxxxxxxxxxxxxxxxxxxxxx
    VITE_FB_AUTH_DOMAIN = wowart-portal.firebaseapp.com
    VITE_FB_DB_URL = https://wowart-portal-default-rtdb...
    VITE_FB_PROJECT_ID = wowart-portal
    VITE_FB_STORAGE = wowart-portal.firebasestorage.app
    VITE_FB_SENDER_ID = 123456789012
    VITE_FB_APP_ID = 1:123456789012:web:abcdef123456
    ```
- Bấm **Deploy**
- Chờ 1-2 phút...

### 3.4 XONG!
- Vercel cho bạn link: **https://wowart-portal.vercel.app**
- Mở link → thấy Portal → Đăng nhập Admin → THÀNH CÔNG!

### 3.5 (Tùy chọn) Custom domain
- Nếu muốn link đẹp (VD: portal.wowart.vn):
  - Vercel Dashboard → Settings → Domains → Add domain
  - Cấu hình DNS theo hướng dẫn Vercel

---

## BƯỚC 4: Gửi link cho GV

1. Copy link Vercel (VD: https://wowart-portal.vercel.app)
2. Gửi vào Zalo group GV
3. GV mở trên Chrome → Menu (⋮) → "Thêm vào màn hình chính"
4. GV đăng nhập: Chọn tên → Nhập SĐT → Vào Portal

---

## XỬ LÝ SỰ CỐ

### Build fail trên Vercel?
- Kiểm tra Environment Variables đã thêm đủ 7 biến chưa
- Kiểm tra tên biến phải bắt đầu bằng `VITE_`

### Data không hiện?
- Kiểm tra `VITE_FB_DB_URL` có đúng URL database không
- Vào Firebase Console → Realtime Database → kiểm tra Rules là `".read": true`

### GV không đăng nhập được?
- Kiểm tra SĐT trong Portal khớp với SĐT GV nhập
- SĐT phải đúng format (VD: 0901234567)

---

## CẬP NHẬT CODE SAU NÀY

Khi cần update Portal (thêm tính năng, fix bug):
1. Vào GitHub repo → sửa file → Commit
2. Vercel tự động build lại (2 phút)
3. Link cũ tự update, GV không cần làm gì

---

## BẢO MẬT (PHASE 2 — Sau khi chạy ổn)

Hiện tại: Mọi người có link đều truy cập được. OK cho nội bộ WOW ART.

Sau này nếu cần bảo mật hơn:
1. Thêm Firebase Authentication
2. Mỗi GV có tài khoản riêng
3. Database rules kiểm tra user đã login
4. → Claude có thể build phần này trong session sau
