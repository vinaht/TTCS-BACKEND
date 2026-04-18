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
3. Cap nhat file `.env`
4. `cmd /c npm.cmd run dev`

## Cau hinh MySQL

Backend dung `mysql2` va se thu `SELECT 1` khi khoi dong.

Bien moi truong can dung:

- `DB_ENABLED=true`
- `DB_HOST=localhost`
- `DB_PORT=3306`
- `DB_USER=...`
- `DB_PASSWORD=...`
- `DB_NAME=cubeal`

Sau khi dien dung tai khoan MySQL, kiem tra:

- `GET /api/health` de xem trang thai database
- Log startup se hien `database: connected:cubeal@localhost:3306`

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
- `GET /api/admin/status`
- `GET /api/admin`
- `POST /api/algorithms`
- `PUT /api/algorithms/:id`
- `DELETE /api/algorithms/:id`

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
  "penalty": "none",
  "scramble": "R U R' U'",
  "notes": "first solve"
}
```

Stats:

- `GET /api/stats` chi tra ve thong ke cua user dang dang nhap
- `GET /api/solves` chi tra ve solve cua user dang dang nhap
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
- Cac module nghiep vu khac van dang o trang thai scaffold
