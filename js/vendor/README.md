# Thư viện cho sách

- `jquery-3.7.1.min.js`: jQuery 3.7.1, từ https://code.jquery.com/jquery-3.7.1.min.js. Giữ nguyên thông tin giấy phép trong file.
- `turn.js`: Turn.js 4.1.0, từ https://github.com/blasten/Turn.js-4th-release/blob/master/lib/turn.js. Giữ nguyên thông tin bản quyền và liên kết giấy phép trong file.

Bản Turn.js có các sửa cục bộ sau:

- `_eventReleased`: nhận diện góc `r` của bìa cứng là phía lật tiến trong chế độ một trang, kể cả khi kéo lâu hơn 200ms.
- `_eventStart`: đọc hướng từ ký tự cuối của tên góc (`l`/`r` hoặc `bl`/`br`), tính lại trang đích mỗi thao tác và kiểm tra giới hạn trang. `_eventReleased` cũng kiểm tra giới hạn trước khi lật.
- `_touchStart`: bỏ qua sự kiện cảm ứng không thể hủy khi trình duyệt đang cuộn.
- `_fold`: mở rộng dải sáng/tối trên mặt giấy và bóng đổ bên dưới nếp uốn.
- `turnPage`: nâng góc giấy theo đường vòng cung; chuyển động tăng/giảm tốc bằng hàm cos. Bìa cứng giữ đường lật riêng.

`js/story-book.js` dùng Pointer Events tại hai mép trên thiết bị cảm ứng, chuyển tọa độ về bộ xử lý gấp giấy của Turn.js. Phần giữa trang vẫn cho phép cuộn dọc. Nội dung HTML không được sao chép sang canvas hoặc ảnh.

Nội dung sách nằm trong `index.html`, giao diện trong phần STORY BOOK của `css/style.css`, và phần khởi tạo/điều khiển trong `js/story-book.js`.
