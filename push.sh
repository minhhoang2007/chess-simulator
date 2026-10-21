#!/usr/bin/env bash
# Script đẩy source code lên GitHub minhhoang2007
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

echo "=========================================================="
echo " ♔ ĐẨY DỰ ÁN LÊN GITHUB: minhhoang2007/liquid-glass-chess-3d"
echo "=========================================================="
echo ""
echo "1. Đảm bảo bạn đã bấm 'New Repository' trên tab GitHub đang mở"
echo "   với tên: liquid-glass-chess-3d"
echo "   (hoặc bất kỳ tên nào bạn muốn, có thể sửa git remote)"
echo ""
echo "2. Đang tiến hành push nhánh 'main' lên origin..."
echo ""

git push -u origin main

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ ĐÃ PUSH THÀNH CÔNG LÊN GITHUB!"
  echo "🔗 Xem mã nguồn tại: https://github.com/minhhoang2007/liquid-glass-chess-3d"
else
  echo ""
  echo "⚠️ Nếu bạn cần dùng GitHub Token (PAT) hoặc SSH:"
  echo "   Cách 1 (Dùng Token): git remote set-url origin https://<TOKEN>@github.com/minhhoang2007/liquid-glass-chess-3d.git"
  echo "   Cách 2 (Dùng SSH):   git remote set-url origin git@github.com:minhhoang2007/liquid-glass-chess-3d.git"
  echo "   Sau đó chạy lại: ./push.sh"
fi
