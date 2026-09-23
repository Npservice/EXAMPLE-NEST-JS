# Example NestJS

Starter backend NestJS yang udah lengkap sama Auth (JWT access + refresh token), RBAC berbasis permission, upload file (signed URL), response envelope standar, caching Redis, dan rate limiting — siap dipakai berulang buat project baru.

## Tech stack

| Layer | Teknologi |
|---|---|
| Framework | [NestJS](https://nestjs.com) 12 |
| Database | MySQL + [TypeORM](https://typeorm.io) |
| Cache | Redis (`@nestjs/cache-manager` + `@keyv/redis`) |
| Auth | JWT (`@nestjs/jwt` + `passport-jwt`), refresh token via httpOnly cookie |
| Validasi | `class-validator` + `class-transformer` |
| Test | Vitest |
| Package manager | pnpm |

## Arsitektur

### Prinsip

- **Modular per domain**, bukan per layer — tiap fitur (`auth`, `users`, `files`) punya folder sendiri berisi controller/service/entity/dto-nya masing-masing.
- **Guard-based security** — semua endpoint terkunci login secara default (global guard), kecuali ditandai `@Public()`.
- **Permission-first authorization** — pengecekan akses utamanya pakai `@Permissions(...)`, bukan cuma role. `@Roles(...)` tetap tersedia sebagai lapisan tambahan (opsional, bisa dipasang bareng).
- **Response envelope konsisten** — semua response API (sukses maupun error) punya bentuk yang sama, di-generate otomatis lewat interceptor + exception filter global, bukan ditulis manual di tiap endpoint.

### Alur request (urutan guard/pipe global)

```
Request masuk
   │
   ▼
ThrottlerGuard        → rate limiting (429 kalau kelebihan)
   │
   ▼
JwtAuthGuard           → wajib login, kecuali @Public()
   │                      (verifikasi JWT lewat passport-jwt, isi request.user)
   ▼
RolesGuard             → cek @Roles(...) kalau ada di endpoint
   │
   ▼
PermissionsGuard        → cek @Permissions(...) kalau ada di endpoint
   │
   ▼
ValidationPipe          → validasi body/query pakai DTO (class-validator)
   │
   ▼
Controller → Service → Repository → Database
   │
   ▼
ResponseInterceptor     → bungkus hasil sukses jadi { status, code, message, data }
   (atau)
HttpExceptionFilter     → bungkus error jadi { status: "error", code, message, data: null }
```

### Struktur folder

```
src/
├── main.ts                        # bootstrap: CORS, cookie-parser, ValidationPipe
├── app.module.ts                  # wiring semua module + global guard/interceptor/filter
│
├── common/                        # lintas-module, gak spesifik ke satu domain
│   ├── decorators/
│   │   ├── public.decorator.ts        # @Public() → skip JwtAuthGuard
│   │   ├── roles.decorator.ts         # @Roles(...) → dicek RolesGuard
│   │   ├── permissions.decorator.ts   # @Permissions(...) → dicek PermissionsGuard
│   │   ├── response-message.decorator.ts # @ResponseMessage('...') → custom message di envelope
│   │   └── current-user.decorator.ts  # @CurrentUser() → ambil user dari request
│   ├── guards/
│   │   ├── jwt-auth.guard.ts          # validasi JWT (global)
│   │   ├── roles.guard.ts             # cek role (global, no-op kalau endpoint gak pasang @Roles)
│   │   └── permissions.guard.ts       # cek permission (global, no-op kalau gak pasang @Permissions)
│   ├── interceptors/
│   │   └── response.interceptor.ts    # bungkus response sukses (global)
│   ├── filters/
│   │   └── http-exception.filter.ts   # bungkus response error (global)
│   ├── types/
│   │   └── authenticated-user.ts      # shape data user yang login (dari JWT payload)
│   └── utils/
│       ├── paging.util.ts             # helper format { items, meta } buat pagination
│       └── signed-url.util.ts         # HMAC sign/validate buat signed URL file
│
├── config/
│   ├── database.config.ts         # config TypeORM (dipakai NestJS app)
│   └── redis.config.ts            # config cache Redis
│
├── database/
│   ├── data-source.ts             # DataSource standalone (dipakai seeder, di luar konteks Nest)
│   └── seeds/
│       ├── permission.seed.ts     # seed daftar permission
│       ├── role.seed.ts           # seed role + assign permission ke role
│       ├── user.seed.ts           # seed 1 user admin default
│       └── run-seed.ts            # orchestrator, jalanin ketiganya berurutan
│
└── modules/
    ├── auth/                      # login/register/refresh/logout + entity Role & Permission
    │   ├── entities/
    │   │   ├── role.entity.ts
    │   │   └── permission.entity.ts   # relasi many-to-many ke Role (tabel role_has_permission)
    │   ├── strategies/jwt.strategy.ts # passport strategy, verifikasi token
    │   ├── dto/
    │   ├── auth.controller.ts     # /auth/register, /auth/login, /auth/refresh, /auth/logout
    │   ├── auth.service.ts        # generate token pair, hash password, flatten permission
    │   ├── roles.controller.ts    # /roles, /permissions, /roles/:id, PATCH /roles/:id/permissions
    │   ├── roles.service.ts
    │   └── auth.module.ts
    │
    ├── users/                     # entity User + relasi many-to-many ke Role (tabel user_roles)
    │   ├── entities/user.entity.ts
    │   ├── dto/
    │   ├── users.repository.ts    # extends Repository<User>, query domain-specific
    │   ├── users.service.ts
    │   ├── users.controller.ts    # /users (CRUD + pagination + search)
    │   └── users.module.ts
    │
    └── files/                     # upload file, signed URL, public/private access
        ├── entities/file.entity.ts
        ├── guards/signed-url.guard.ts  # validasi signed URL (dipakai khusus GET /files/signed/:id)
        ├── files.service.ts
        ├── files.controller.ts    # /files/store, /files/:id, /files/public/:id, dst
        └── files.module.ts
```

### Skema database

```
users ───┐
         │ M:N (tabel: user_roles)
roles ───┤
         │ M:N (tabel: role_has_permission)
permissions

files   (independen, gak ada relasi ke tabel lain)
```

Semua primary key pakai **UUID**. `users`, `roles`, `permissions`, dan `files` punya kolom `deletedAt` (soft delete) — data yang di-`DELETE` gak beneran hilang dari database, cuma ditandai, dan otomatis gak muncul lagi di query berikutnya.

### Kenapa response-nya dibungkus semua?

Setiap response sukses otomatis jadi:
```json
{ "status": "success", "code": 200, "message": "Success", "data": { ... } }
```
dan setiap error otomatis jadi:
```json
{ "status": "error", "code": 404, "message": "User #x not found", "data": null }
```
Kamu gak perlu nulis ini manual di tiap controller — cukup `throw new NotFoundException(...)` seperti biasa, atau tambahin `@ResponseMessage('Pesan custom')` kalau mau ganti message default-nya.

Pengecualian: endpoint yang ngirim file mentah (`GET /files/:id`, dst) pakai `@Res() res: Response` langsung, jadi **gak** dibungkus — response-nya berupa file binary asli.

## Prasyarat

- Node.js 20+
- pnpm
- MySQL (lokal atau remote)
- Redis (lokal atau remote)

## Setup

### 1. Install dependency

```bash
pnpm install
```

### 2. Siapkan environment variable

Copy `.env.example` ke `.env`, lalu sesuaikan:

```bash
cp .env.example .env
```

| Variable | Keterangan |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | Koneksi MySQL |
| `JWT_SECRET` | Secret buat sign/verify JWT — **wajib diganti** sebelum production |
| `JWT_ACCESS_EXPIRES_IN` | Masa berlaku access token (default `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Masa berlaku refresh token (default `7d`) |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Koneksi Redis |
| `CACHE_TTL` | Default TTL cache dalam detik |
| `THROTTLE_TTL`, `THROTTLE_LIMIT` | Rate limit: berapa request per berapa detik |
| `APP_URL` | Base URL aplikasi (dipakai buat generate signed URL file) |
| `FILE_TEMP_DIR`, `FILE_STORAGE_DIR` | Folder penyimpanan file upload (lokal disk) |
| `SIGNED_URL_SECRET` | Secret buat HMAC signed URL file — **wajib diganti** sebelum production |

> Database tabel dibuat **otomatis** lewat `synchronize: true` saat `NODE_ENV` bukan `production`. Gak perlu jalanin migration manual di development — cukup pastikan database (`DB_DATABASE`) udah dibuat duluan di MySQL-nya, tabelnya nanti otomatis.

### 3. Jalankan aplikasi

```bash
pnpm start:dev     # development, auto-reload
pnpm start         # tanpa watch
pnpm start:prod    # production (jalanin dari dist/, perlu `pnpm build` dulu)
```

Server default jalan di `http://localhost:3000`.

### 4. Seed data awal (role, permission, user admin)

```bash
pnpm seed
```

Ini bakal:
- Bikin permission (`users:create`, `users:read`, `users:update`, `users:delete`, `roles:read`, `roles:update`)
- Bikin role `admin` (semua permission), `editor` (read+update user), `user` (read user aja)
- Bikin user admin default: **`admin@example.com` / `admin12345`**

Aman dijalanin berkali-kali (idempotent — data yang udah ada bakal di-skip, bukan diduplikat).

## Testing

```bash
pnpm test          # unit test
pnpm test:watch    # watch mode
pnpm test:cov      # dengan coverage
pnpm test:e2e      # end-to-end test
```

## Ringkasan endpoint

Semua endpoint di-prefix `/api/v1` (diset global lewat `app.setGlobalPrefix('api/v1')` di `main.ts`).

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Daftar user baru |
| POST | `/api/v1/auth/login` | Public | Login, balikin access token + set cookie refresh token |
| PATCH | `/api/v1/auth/refresh` | Public (butuh cookie) | Refresh access token |
| POST | `/api/v1/auth/logout` | Public | Hapus cookie refresh token |
| GET | `/api/v1/roles` | `roles:read` | List semua role |
| GET | `/api/v1/permissions` | `roles:read` | List semua permission |
| GET | `/api/v1/roles/:id` | `roles:read` | Detail role + permission-nya |
| PATCH | `/api/v1/roles/:id/permissions` | `roles:update` | Ganti set permission suatu role |
| POST | `/api/v1/users` | `users:create` | Buat user (admin) |
| GET | `/api/v1/users?page=&size=&search=` | `users:read` | List user (pagination + search) |
| GET | `/api/v1/users/:id` | `users:read` | Detail user |
| PATCH | `/api/v1/users/:id` | `users:update` | Update user |
| DELETE | `/api/v1/users/:id` | `users:delete` | Soft-delete user |
| POST | `/api/v1/files/store` | login | Upload file (multipart, field `files`) |
| GET | `/api/v1/files/:id` | login | Ambil isi file (private) |
| GET | `/api/v1/files/:id/signed-url` | login | Generate signed URL sementara buat file |
| GET | `/api/v1/files/public/:id` | Public | Ambil isi file (status `public`) |
| GET | `/api/v1/files/public/:id/data` | Public | Generate signed URL buat file public |
| GET | `/api/v1/files/signed/:id` | Public + signature valid | Akses file lewat signed URL |

## Cara pakai proteksi endpoint baru

```ts
@Controller('contoh')
export class ContohController {
  @Public()                              // skip login sepenuhnya
  @Get('health')
  health() { return 'ok'; }

  @Permissions('contoh:read')            // wajib login + punya permission ini
  @Get()
  findAll() { ... }

  @Roles('admin')                        // wajib login + role 'admin' (opsional, bisa gabung sama @Permissions)
  @Permissions('contoh:delete')
  @ResponseMessage('Berhasil dihapus')   // custom message di response envelope
  @Delete(':id')
  remove(@Param('id') id: string) { ... }
}
```

Ambil data user yang lagi login:
```ts
@Get('me')
me(@CurrentUser() user: AuthenticatedUser) {
  return user; // { userId, email, roles, permissions }
}
```

## Deployment

Sebelum deploy ke production, pastikan:
- `NODE_ENV=production` (biar `synchronize` mati — pakai migration TypeORM buat perubahan skema di production, bukan auto-sync)
- `JWT_SECRET` dan `SIGNED_URL_SECRET` diganti dari nilai default
- `secure: true` buat cookie refresh token otomatis aktif kalau `NODE_ENV=production` (lihat `auth.controller.ts`)
