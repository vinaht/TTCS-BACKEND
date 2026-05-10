# CubeAL Backend

Backend nay duoc dung theo mo hinh MVC va hien da co ket noi MySQL co ban cho moi truong local.

## Cau truc

- `src/config/`: env, database
- `src/routes/`: khai bao endpoint
- `src/controllers/`: nhan request, tra response
- `src/services/`: xu ly nghiep vu
- `src/repositories/`: lop truy cap du lieu
- `src/models/`: placeholder model
- `src/middlewares/`: xu ly loi, not found
- `src/utils/`: helper dung chung

## Chay project

1. `cd Backend`
2. `cmd /c npm.cmd install`
3. Copy `.env.example` thanh `.env`
4. Cap nhat `DB_PASSWORD`, `JWT_SECRET`, va cac bien `DB_*` trong `.env`
5. `cmd /c npm.cmd run db:create`
6. `cmd /c npm.cmd run seed:local`
7. `cmd /c npm.cmd run dev`

Tai khoan admin demo mac dinh:

- Email: `admin@cubeal.local`
- Password: `Admin@123456`

Co the doi bang cac bien `LOCAL_ADMIN_EMAIL`, `LOCAL_ADMIN_USERNAME`, `LOCAL_ADMIN_PASSWORD`.
Neu tai khoan admin da ton tai, script seed se giu mat khau cu. Dat
`LOCAL_ADMIN_RESET_PASSWORD=true` neu muon reset mat khau theo `.env`.

## Cau hinh MySQL

Backend dung `mysql2` va se thu `SELECT 1` khi khoi dong.

Bien moi truong can dung:

- `DB_ENABLED=true`
- `DB_HOST=localhost`
- `DB_PORT=3306`
- `DB_USER=...`
- `DB_PASSWORD=...`
- `DB_NAME=cubeal`
- `SMTP_HOST=...`
- `SMTP_PORT=587`
- `SMTP_USER=...`
- `SMTP_PASSWORD=...`
- `SMTP_FROM=...`
- `REMINDER_INACTIVE_DAYS=60`
- `REMINDER_COOLDOWN_DAYS=7`
- `REMINDER_CRON=0 8 * * *`

Sau khi dien dung tai khoan MySQL, kiem tra:

- `GET /api/health` de kiem tra database khi chay local/deploy (endpoint ky thuat, khong phai chuc nang nguoi dung)
- Log startup se hien `database: connected:cubeal@localhost:3306`

## Seed catalog local

Backend co cac script setup local:

- `cmd /c npm.cmd run db:create`: tao database `DB_NAME` neu chua co
- `cmd /c npm.cmd run seed:admin`: tao hoac nang role admin local
- `cmd /c npm.cmd run seed:algorithms`: tao/cap nhat catalog CFOP tu anh F2L/OLL/PLL trong `Frontend/assets/image` va copy anh vao `uploads`
- `cmd /c npm.cmd run seed:local`: chay seed admin va catalog cong thuc

Script seed cong thuc la idempotent: chay lai se cap nhat catalog theo
`course`, `stage`, `category`, `caseCode` thay vi tao trung. Cac record demo
Beginner va CFOP Cross cu se duoc tat hien thi de khong con xuat hien tren web.

## Auth module

Bang `users` duoc dung cho auth voi cac cot:

- `id`
- `username`
- `email`
- `password`
- `role`
- `last_login_at`
- `created_at`
- `updated_at`

Luu y:

- Cot `password` luu chuoi da duoc hash bang `bcrypt`
- Backend se tu dong bo sung `last_login_at` va `updated_at` neu bang `users` da ton tai nhung chua co 2 cot nay

Auth endpoints:

- `GET /api/auth/status`
- `GET /api/auth/me`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `PATCH /api/auth/password`

Auth middleware:

- Dung header `Authorization: Bearer <token>`
- Middleware nam o `src/middlewares/auth.middleware.js`
- `authenticate`: xac thuc JWT va nap `req.user`
- `requireRole(...)`: chan theo role
- `requireAdmin`: shortcut cho role `admin`

Route da duoc bao ve:

- `GET /api/solves`
- `POST /api/solves`
- `GET /api/stats`
- `PATCH /api/auth/password`
- `GET /api/user-formulas`
- `POST /api/user-formulas`
- `PUT /api/user-formulas/:id`
- `DELETE /api/user-formulas/:id`
- `GET /api/admin/status`
- `GET /api/admin`
- `GET /api/admin/algorithms`
- `GET /api/admin/algorithms/:id`
- `POST /api/admin/algorithms`
- `PUT /api/admin/algorithms/:id`
- `DELETE /api/admin/algorithms/:id`
- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id`

Payload dang ky:

```json
{
  "username": "cubelearner",
  "email": "cube@example.com",
  "password": "secret123"
}
```

Payload dang nhap:

```json
{
  "email": "cube@example.com",
  "password": "secret123",
  "remember": true
}
```

Payload luu solve:

```json
{
  "durationMs": 15234,
  "scramble": "R U R' U'",
  "notes": "first solve"
}
```

Stats:

- `GET /api/stats` chi tra ve thong ke cua user dang dang nhap
- `GET /api/solves` chi tra ve solve cua user dang dang nhap
- `GET /api/user-formulas` chi tra ve cong thuc cua user dang dang nhap
- `GET /api/auth/me` tra ve user hien tai dua tren JWT

## Trang thai hien tai

- Da co server Express
- Da co health check `/api/health`
- Da scaffold route cho `auth`, `algorithms`, `solves`, `stats`, `admin`
- Da ket noi MySQL cho backend
- Da implement auth register/login/status/me voi bang `users`
- Da implement auth middleware va role guard
- Da implement `solves` theo `user_id`
- Da implement `stats` theo user dang dang nhap
- Da implement cong thuc ca nhan theo user dang dang nhap
- Da implement CRUD admin cho `algorithms`
- Da implement admin API xem danh sach user dang hoat dong va cap nhat thong tin user
- Da implement mail nhac nho user khong hoat dong bang SMTP va scheduler tu dong hang ngay
