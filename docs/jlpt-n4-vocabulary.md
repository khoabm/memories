# Bộ từ vựng học tập JLPT N4

## Phạm vi

Đây là bộ sưu tập học tập N4 được biên soạn và đối chiếu, không phải danh sách từ vựng chính thức hoặc tuyên bố đầy đủ của kỳ thi JLPT. JLPT không công bố danh sách từ vựng chính thức cho các kỳ thi hiện hành. Bộ dữ liệu ban đầu trong lần triển khai này có **121 mục** (số mục được tính theo dữ liệu nguồn trong `js/flashcards-data.js`); cần tiếp tục rà soát trước khi xem là bộ sưu tập hoàn chỉnh.

## Nguồn tham khảo

- [Tanos JLPT N4](https://www.tanos.co.uk/jlpt/jlpt4/)
- [J-nihongo N4](https://j-nihongo.com/en/vocabulary/jlpt/n4/)
- [Tomoshi Japanese Dictionary](https://dict.tomoshi.app/en/w/n4/)
- [Nihongo Circle N4](https://nihongocircle.com/n4/vocabulary)
- [Hanabira](https://hanabira.org/)

## Phương pháp và giới hạn

Các mục được chọn từ danh sách học tập N4 phổ biến; trường `sources` trên từng mục ghi nguồn tham khảo dùng khi biên soạn. Việc đối chiếu hiện mang tính biên soạn ban đầu, chưa phải xác minh độc lập từng mục trên toàn bộ nguồn. Không gộp hai mục chỉ vì cách đọc giống nhau; động từ đồng âm như 書く・引く được giữ riêng khi nghĩa khác nhau. Dạng động từ/cụm từ có cùng từ vựng gốc cần rà soát thêm để tránh lặp. Nghĩa tiếng Việt và câu ví dụ được viết cho mục đích học tập; bản phát hành này chưa qua biên tập ngôn ngữ độc lập. Một số mục có khả năng thuộc kiến thức N5 tích lũy hoặc khác nhau theo danh sách học liệu. Tổng số mục cần được cập nhật khi bộ sưu tập được mở rộng và kiểm chứng.

Không có dữ liệu người học nào được gửi đi. Tiến độ lưu tại `localStorage` với khóa `memories:n4-flashcards:v1`, độc lập với dữ liệu từ vựng.
