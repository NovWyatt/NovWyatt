# Hướng dẫn sửa trang GitHub

Trang https://github.com/NovWyatt được vẽ tự động từ một tệp duy nhất: **`profile.yml`**.
`README.md`, mọi ảnh trong `assets/` và biểu đồ trong `profile-3d-contrib/` đều do máy sinh ra; sửa tay sẽ bị ghi đè ở lần chạy sau.

## Sửa nhanh trên github.com (không cần cài gì)

1. Mở `profile.yml` trên GitHub, bấm biểu tượng bút chì.
2. Sửa, rồi bấm **Commit changes**.
3. Đợi khoảng 1 phút: GitHub Actions (workflow **Profile**) vẽ lại ảnh, cập nhật README và tự commit.
   Xem tiến độ ở tab **Actions**. Nếu báo lỗi đỏ, mở lần chạy đó để đọc dòng lỗi (thường là sai thụt lề YAML hoặc tên icon).

## Mạng xã hội

Mỗi mạng là 3 dòng trong mục `socials`. Thêm, xoá hay đổi thứ tự đều được:

```yaml
socials:
  - label: Facebook
    url: https://www.facebook.com/ten-cua-ban
    icon: facebook
```

- `icon` là tên viết thường trên https://simpleicons.org (ví dụ `facebook`, `tiktok`, `youtube`, `discord`, `x`, `zalo`).
- Không có trên Simple Icons thì dùng icon Phosphor: `icon: phosphor:globe` (tra tên ở https://phosphoricons.com).
  Ví dụ LinkedIn đã bị gỡ khỏi Simple Icons, dùng `icon: phosphor:linkedin-logo`.
- Email dùng dạng `url: mailto:ten@gmail.com`.

Mỗi nút là một ảnh riêng trong `assets/social/`, bấm vào là mở đúng đường dẫn.

## Dự án nổi bật

Mỗi dự án là một mục trong `projects`:

| Trường | Ý nghĩa |
| --- | --- |
| `id` | Tên tệp ảnh, viết thường không dấu, ví dụ `tool-win` |
| `title`, `description`, `tags` | Chữ hiện trên thẻ. Mô tả nên dưới 160 ký tự để vừa 3 dòng |
| `repo` | Repo hiện trên thẻ và nơi lấy số liệu |
| `link` | Tuỳ chọn: bấm thẻ thì mở đâu (mặc định là `repo`) |
| `size` | `wide` (cả hàng, có ảnh chụp màn hình nghiêng 3D) hoặc `half` (hai thẻ cạnh nhau) |
| `image` | Bắt buộc với `wide`: ảnh chụp màn hình trong thư mục `media/` |
| `icon` | Icon Phosphor, ví dụ `phosphor:database` |
| `status` | `open-source`, `live`, `release` (hiện phiên bản mới nhất) hoặc `closed` |
| `show` | `false` để tạm ẩn mà không phải xoá |

Thẻ `half` nên đi theo cặp để hai thẻ nằm cạnh nhau.

## Bàn phím công nghệ

Mục `stack`: mỗi hàng có một phím nhóm (`row`) và tối đa 6 phím. Phím là tên icon Simple Icons,
hoặc `{ label: "C#", icon: "phosphor:file-c-sharp" }` khi cần đổi chữ hay dùng icon Phosphor.

## Chạy thử trên máy

Cần Node.js 22 trở lên.

```bash
npm ci
npm run build
npm run preview
```

`npm run preview` mở http://localhost:4173, dựng README bằng chính bộ dựng Markdown của GitHub.
Thêm `?theme=light` để xem giao diện sáng. Chỉ vẽ lại một phần: `npm run build -- hero cards readme`.

## Token (tuỳ chọn)

Mặc định Actions chỉ đọc được repo công khai. Muốn biểu đồ 3D và số commit tính cả repo private:

1. Tạo token cá nhân (classic) quyền `repo` và `read:user` ở GitHub > Settings > Developer settings.
2. Repo này > Settings > Secrets and variables > Actions > New repository secret, tên `PROFILE_TOKEN`.

Không có token thì số liệu repo private lấy từ `data/github.json` (lần build gần nhất trên máy có quyền).

## Thư viện dùng

| Thư viện | Dùng cho | Giấy phép |
| --- | --- | --- |
| opentype.js | Dựng chữ thành path để ảnh hiện đúng font | MIT |
| sharp | Thu nhỏ ảnh chụp màn hình, nhúng vào SVG | Apache-2.0 |
| yaml | Đọc `profile.yml` | ISC |
| simple-icons | Logo công nghệ và mạng xã hội | CC0-1.0 |
| @phosphor-icons/core | Icon chung | MIT |
| yoshi389111/github-profile-3d-contrib | Biểu đồ đóng góp 3D (chạy trong Actions) | MIT |
| Font Unbounded, Be Vietnam Pro, JetBrains Mono | Chữ trong ảnh (thư mục `fonts/`) | SIL OFL 1.1 |

## Cấu trúc thư mục

```
profile.yml            nội dung trang (chỉ sửa tệp này)
media/                 ảnh chụp màn hình gốc cho thẻ wide
fonts/                 font và giấy phép OFL
scripts/build.mjs      sinh README.md và assets/
scripts/preview.mjs    máy chủ xem trước
scripts/lib/           các phần vẽ: hero, cards, stack, bits (nút, tiêu đề), readme
3d-contrib.json        màu của biểu đồ đóng góp 3D
data/github.json       số liệu repo đã lưu
assets/                ảnh do máy sinh
profile-3d-contrib/    biểu đồ do Actions sinh
```
