# CubeAL Backend

Backend cho hệ thống CubeAL, được xây dựng bằng Express.js theo mô hình MVC và sử dụng MySQL để lưu trữ dữ liệu.

## Tính năng chính

- Xác thực người dùng bằng JWT
- Đăng ký, đăng nhập và đổi mật khẩu
- Quản lý thời gian solve Rubik theo từng người dùng
- Thống kê kết quả luyện tập cá nhân
- Quản lý công thức Rubik cá nhân
- Quản trị viên có thể quản lý thuật toán và người dùng
- Gửi email nhắc nhở người dùng không hoạt động

## Công nghệ sử dụng

- Node.js
- Express.js
- MySQL
- JWT
- Bcrypt
- SMTP

## Cấu trúc chính

- `routes`: khai báo API
- `controllers`: xử lý request và response
- `services`: xử lý nghiệp vụ
- `repositories`: truy cập dữ liệu
- `middlewares`: xử lý xác thực, phân quyền và lỗi
- `config`: cấu hình môi trường và database

## Trạng thái

Project đã có các chức năng chính cho authentication, quản lý solve, thống kê, công thức cá nhân, quản trị thuật toán, quản lý người dùng và gửi email nhắc nhở.