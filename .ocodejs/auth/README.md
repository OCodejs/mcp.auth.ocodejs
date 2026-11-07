# OCodeJS Auth

Trang đăng nhập / đăng ký cho **OCodeJS**: nền đen tối giản, góc vuông 100%, font mono. Một file HTML duy nhất, không cần build, không phụ thuộc thư viện.

## Tính năng

- Hai màn hình trong một file: **Log in** và **Sign up**
- Chuyển màn hình bằng hash route: `#login`, `#signup`
- Nút OAuth: Google, GitHub (giao diện sẵn, chưa nối backend)
- Form email (đăng nhập) và email + mật khẩu (đăng ký)
- Nút Submit tự khóa cho đến khi dữ liệu hợp lệ
- Nút hiện/ẩn mật khẩu
- Checkbox nhận tin cập nhật (tùy chọn)
- Responsive, tối ưu mobile (safe-area cho iPhone)

## Cấu trúc

```
ocodejs-auth.html   # HTML + CSS + JS trong một file
README.md
```

## Chạy thử

Mở trực tiếp `ocodejs-auth.html` bằng trình duyệt, hoặc serve tĩnh:

```bash
npx serve .
```

| URL | Màn hình |
| --- | --- |
| `/ocodejs-auth.html` | Log in (mặc định) |
| `/ocodejs-auth.html#login` | Log in |
| `/ocodejs-auth.html#signup` | Sign up |

## Quy tắc validate (phía client)

- **Email**: khớp `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- **Password** (đăng ký): tối thiểu 8 ký tự
- Nút Submit chỉ bật khi các điều kiện trên đạt

> Validate phía client chỉ để hỗ trợ trải nghiệm. Backend phải validate lại.

## Thiết kế

Toàn bộ màu và font nằm ở CSS variables trong `:root`:

```css
:root{
  --bg:#000;        /* nền */
  --fg:#f5f5f5;     /* chữ chính */
  --muted:#8a8a8a;  /* chữ phụ */
  --line:#262626;   /* viền */
  --field:#0a0a0a;  /* nền ô nhập */
  --hover:#141414;  /* hover */
  --mono:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
}
```

- Góc vuông: `border-radius: 0 !important` áp dụng cho mọi phần tử
- Font: JetBrains Mono (Google Fonts), có fallback sang font mono của hệ thống
- Logo: SVG inline trong `.mark`, thay bằng logo thật nếu cần

## Nối backend

Hiện tại form chỉ hiển thị thông báo demo. Các điểm cần nối nằm trong thẻ `<script>`:

1. **Submit form** – trong `bind()`, handler `submit`:

   ```js
   f.addEventListener('submit', async function(e){
     e.preventDefault();
     // gọi API của bạn, ví dụ:
     // await fetch('/api/auth/login', {
     //   method: 'POST',
     //   headers: {'Content-Type': 'application/json'},
     //   body: JSON.stringify({ email })
     // });
   });
   ```

2. **OAuth** – handler click của `.oauth` (thuộc tính `data-p` là `Google` hoặc `GitHub`). Chuyển hướng tới endpoint OAuth của server, ví dụ `/auth/google`.

3. **Thông báo lỗi/thành công** – ghi vào phần tử `#msg`.

### Gợi ý bảo mật

- Luôn dùng HTTPS
- Hash mật khẩu ở server (argon2 hoặc bcrypt), không lưu plaintext
- Đặt cookie phiên với `HttpOnly`, `Secure`, `SameSite`
- Thêm rate limit và CSRF protection cho endpoint auth
- Không đặt token hay secret trong hash URL

## Khả năng truy cập

- Mỗi ô nhập có `<label>` đi kèm
- Nút hiện/ẩn mật khẩu có `aria-label`
- Vùng thông báo `#msg` dùng `role="status"`
- Trạng thái focus hiển thị rõ bằng viền sáng

## Tùy biến nhanh

| Muốn | Sửa |
| --- | --- |
| Đổi tên thương hiệu | Thay `OCodeJS` trong `.brand`, tiêu đề `h1`, thẻ `<title>` |
| Đổi logo | Thay SVG trong `.mark` |
| Bỏ đăng nhập OAuth | Xóa các nút `.oauth` và khối `.or` |
| Đổi độ dài mật khẩu tối thiểu | Sửa `>=8` trong `bind('f-signup', ...)` và placeholder |
| Đổi font | Sửa `--mono` và link Google Fonts |

## Giấy phép

Chưa chỉ định. Thêm file `LICENSE` theo nhu cầu của dự án.
