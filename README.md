# ♔ Liquid Glass 3D Chess (Cờ Vua Thủy Tinh Lỏng 3D)

> **Platform chơi cờ vua 3D phong cách Thủy tinh lỏng (Liquid Glass) & Bàn gỗ tự nhiên, đối đầu Engine Stockfish AI từ 600 đến 2200 Elo. Hỗ trợ song ngữ Tiếng Việt & Tiếng Anh.**

---

## 🌟 Tính Năng Nổi Bật (Key Features)

### 💎 Đồ Họa 3D Thủy Tinh Lỏng & Bàn Gỗ Cổ Điển (3D Visuals)
- **Quân cờ Thủy Tinh Lỏng (Liquid Glass)**: Sử dụng Three.js `MeshPhysicalMaterial` với độ khúc xạ ánh sáng cao (`transmission: 0.92`, `ior: 1.54`, `roughness: 0.04`), tạo cảm giác thủy tinh pha lê trong vắt và hắc thạch đen obsidian sang trọng.
- **Phong cách Gỗ Cổ Điển (Classic Wood Desk)**: Tái hiện chân thực bàn cờ gỗ mộc trên nền mặt bàn gỗ tự nhiên (chuẩn 100% góc nhìn từ ảnh mẫu).
- **Bộ quân Staunton chuẩn quốc tế FIDE**: Từng quân cờ (Vua, Hậu, Xe, Tượng, Mã, Tốt) được tạo hình 3D tỉ mỉ bằng toán học giải tích (`LatheGeometry` và `ExtrudeGeometry`).
- **Nhiều bộ theme đa dạng**:
  1. *Thủy Tinh Lỏng (Liquid Glass)* - Hiệu ứng pha lê cao cấp.
  2. *Gỗ Tự Nhiên Cổ Điển (Classic Wood)* - Phong cách ảnh mẫu truyền thống.
  3. *Ngọc Bích Hoàng Gia (Emerald Jade)* - Phỉ thúy và ngọc thạch.
  4. *Kính Neon Dạ Quang (Cyber Neon)* - Phong cách công nghệ tương lai.
- **Góc quay camera linh hoạt**: Chế độ 3D nghệ thuật, 2D nhìn thẳng từ trên xuống (Top-down), góc nhìn cầm Trắng, góc nhìn cầm Đen, tự do xoay 360° và phóng to/thu nhỏ.

### 🤖 Hệ Thống Máy Đấu Stockfish AI (600 - 2200 Elo)
- Tích hợp mã nguồn mở **Stockfish Engine** chạy trực tiếp trên trình duyệt qua WebAssembly & Web Worker (100% miễn phí, offline, không cần server).
- **6 Cấp độ Bot AI được tinh chỉnh chuẩn xác**:
  - **600 Elo** - *Bé Tập Chơi (Tí)*: Mới học chơi cờ, hay đi sót quân, thích hợp người mới bắt đầu.
  - **900 Elo** - *Kỳ Thủ Học Đường (Huy)*: Biết ăn quân có lợi và nhập thành, dễ sơ hở trước đòn chiến thuật.
  - **1200 Elo** - *Phong Trào Quán Cà Phê (Bác Nam)*: Khai cuộc bài bản, kinh nghiệm cờ phong trào.
  - **1500 Elo** - *Chiến Lược Gia (Lan Anh)*: Tính toán 3-5 nước trước, trừng phạt sai lầm chiến thuật.
  - **1800 Elo** - *Cao Thủ Tuyển Tỉnh (Marcus)*: Lối chơi chặt chẽ, tàn cuộc chuẩn xác.
  - **2200 Elo** - *Đại Sư Stockfish Master*: Sức mạnh Stockfish đỉnh cao, thử thách tột đỉnh.
- **Thanh đánh giá thế trận theo thời gian thực (Live Evaluation Bar)**: Hiển thị ưu thế centipawns (`+1.5`, `-0.8`) hoặc đếm nước chiếu hết (`M3`), giao diện như chess.com.

### ♟️ Đầy Đủ Luật Cờ Vua Chuẩn Chess.com (Full Chess Rules)
- Động cơ luật cờ `chess.js`:
  - Kiểm tra và gợi ý tất cả các nước đi hợp lệ.
  - Nhập thành gần (`O-O`), nhập thành xa (`O-O-O`).
  - Bắt tốt qua đường (*En Passant*).
  - Phong cấp tốt (Pawn Promotion) với hộp thoại chọn Hậu, Xe, Tượng, Mã.
  - Nhận diện Chiếu, Chiếu hết (*Checkmate*), Hòa do hết nước đi (*Stalemate*), Hòa do lặp lại 3 lần (*Threefold repetition*), Hòa do thiếu lực lượng, Hòa quy tắc 50 nước.
- **Công cụ hỗ trợ trong trận**:
  - Gợi ý nước đi (*Hint 💡*): Stockfish tính toán và vẽ mũi tên 3D phát sáng chỉ đường.
  - Đi lại nước cờ (*Undo ↶*).
  - Đổi chiều bàn cờ (*Flip ↻*).
  - Đầu hàng (*Resign 🏳*).
  - Khay chứa quân cờ đã ăn kèm chỉ số chênh lệch điểm quân số (`+1`, `+3`).
  - Bảng ghi biên bản nước đi chuẩn đại số (SAN).
  - Hệ thống âm thanh sống động (Move, Capture, Check, Castle, Victory, Defeat) tổng hợp qua Web Audio API.

### 🌐 Đa Ngôn Ngữ (Bilingual EN & VI)
- Chuyển đổi 1-chạm giữa **Tiếng Việt 🇻🇳** và **English 🇬🇧** cho toàn bộ giao diện, thông báo, tiểu sử bot và biên bản.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy (Quick Start)

### 1. Yêu cầu hệ thống
- [Node.js](https://nodejs.org/) (phiên bản 18 trở lên).
- Trình duyệt hỗ trợ WebGL (Chrome, Safari, Firefox, Edge, Opera).

### 2. Cài đặt các thư viện
```bash
cd liquid-glass-chess-3d
npm install
```

### 3. Chạy môi trường phát triển (Development)
```bash
npm run dev
```
Trình duyệt sẽ tự động mở tại `http://localhost:5173/`.

### 4. Đóng gói cho Production
```bash
npm run build
```
Thư mục sản phẩm sẽ được tạo tại `./dist`.

---

## 📦 Cấu Trúc Dự Án (Project Structure)

```
liquid-glass-chess-3d/
├── public/
│   ├── stockfish.js          # Stockfish engine ASM.js fallback
│   ├── stockfish.wasm        # Stockfish WebAssembly binary
│   └── stockfish.wasm.js     # Stockfish Web Worker loader
├── src/
│   ├── audio/
│   │   └── soundEffects.ts   # Bộ tổng hợp âm thanh Web Audio API
│   ├── components/
│   │   ├── BotSelectorModal.tsx   # Modal chọn Bot 600 - 2200 Elo
│   │   ├── CapturedPiecesView.tsx # Khay quân đã ăn & chênh lệch điểm
│   │   ├── EvaluationBar.tsx      # Thanh đánh giá thế trận Stockfish
│   │   ├── GameOverModal.tsx      # Modal kết quả ván cờ & pháo hoa
│   │   ├── MoveHistory.tsx        # Bảng biên bản nước đi (SAN)
│   │   ├── PromotionModal.tsx     # Modal phong cấp tốt
│   │   └── SettingsModal.tsx      # Cài đặt giao diện, âm thanh, chủ đề
│   ├── engine/
│   │   └── stockfishEngine.ts# Dịch vụ giao tiếp Stockfish UCI & Minimax fallback
│   ├── locales/
│   │   └── i18n.ts           # Từ điển song ngữ Việt - Anh
│   ├── three/
│   │   ├── ChessScene.ts     # Bộ điều khiển render 3D Three.js & Raycaster
│   │   ├── StauntonGeometry.ts# Mô hình hình học 3D chuẩn Staunton
│   │   └── TextureGenerator.ts# Tạo texture gỗ bàn & môi trường phản chiếu
│   ├── types/
│   │   └── chess.ts          # Định nghĩa kiểu dữ liệu TypeScript
│   ├── App.tsx               # Thành phần gốc & quản lý luồng game
│   ├── index.css             # Tailwind CSS & hiệu ứng Glassmorphism
│   └── main.tsx              # Điểm khởi chạy React
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

- **3D Graphics Engine**: Three.js (WebGL, MeshPhysicalMaterial, PCFSoftShadowMap, ACESFilmicToneMapping)
- **Chess Engine**: Stockfish UCI WebAssembly + chess.js logic
- **UI Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + Glassmorphism UI
- **Audio**: Web Audio API Sound Synthesizer
- **Icons**: Lucide React
- **Build Tool**: Vite 8

---

## 👤 Tác Giả & Bản Quyền
- GitHub: [minhhoang2007](https://github.com/minhhoang2007)
- Giấy phép: MIT License
