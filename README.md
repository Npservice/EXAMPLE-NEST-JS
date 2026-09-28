# Example NestJS

Starter backend NestJS dengan auth JWT (access + refresh token), RBAC berbasis permission, upload file (signed URL),
todo, cache Redis, dan rate limiting. Semua memakai fitur bawaan NestJS / TypeORM, tanpa helper tambahan.

## Tech stack

| Layer | Teknologi |
|---|---|
| Framework | [NestJS](https://nestjs.com) 12 |
| Database | MySQL + [TypeORM](https://typeorm.io) |
| Cache | Redis (`@nestjs/cache-manager` + `@keyv/redis`) |
| Auth | JWT (`@nestjs/jwt` + `passport-jwt`), refresh token di cookie httpOnly |
| Validasi | `class-validator` + `class-transformer` (`ValidationPipe`, `ClassSerializerInterceptor`) |
| Test | Vitest |
| Package manager | pnpm |

## Struktur folder

```
src/
├── main.ts                 # CORS, cookie-parser, prefix /api/v1, ValidationPipe (error per field)
├── app.module.ts           # TypeORM, cache, throttler + guard/interceptor/filter global
├── common/
│   ├── decorators/         # @Public, @Roles, @Permissions, @ResponseMessage, @CurrentUser
│   ├── guards/             # JwtAuthGuard, RolesGuard, PermissionsGuard, SignedUrlGuard
│   ├── interceptors/       # ResponseInterceptor → { status: "OK", ... }
│   ├── filters/            # HttpExceptionFilter → { status: "FAILED", ... }
│   ├── dto/                # PageQueryDto (?page=0&size=10&search=)
│   ├── types/              # AuthenticatedUser
│   └── utils/              # signed-url.util.ts (HMAC)
├── database/               # data-source.ts + seeds/ (dipakai `pnpm seed`)
└── modules/
    ├── auth/               # register/login/refresh/logout, role & permission
    ├── users/              # CRUD user
    ├── files/              # upload, signed URL, file public/private
    └── todos/              # CRUD todo milik user yang login
        ├── dto/            # create-todo, update-todo, list-todos-query
        ├── entities/       # todo.entity.ts
        ├── todos.controller.ts
        ├── todos.service.ts
        └── todos.module.ts
```

Aturan singkat:
- **Controller** → baca request, panggil service, atur message dengan `@ResponseMessage('...')`.
- **Service** → logika bisnis + query lewat `@InjectRepository(Entity)`. Error cukup `throw new NotFoundException('...')`.
- **DTO** → bentuk request + validasi class-validator (pesan bahasa Indonesia).
- **Entity** → tabel TypeORM. Nama field response snake_case lewat `@Expose({ name: 'created_at' })`,
  field rahasia disembunyikan dengan `@Exclude()`.

## Kontrak API

### Response

```json
{ "status": "OK", "code": 200, "message": "Berhasil ambil data todo", "data": { ... } }
{ "status": "FAILED", "code": 404, "message": "Todo tidak ditemukan", "data": null }
{ "status": "FAILED", "code": 400, "message": "Validation Failed", "data": { "title": "wajib diisi" } }
```

- Semua key response pakai **snake_case** (`access_token`, `is_completed`, `created_at`, `total_elements`).
- Error validasi selalu 400 `Validation Failed` dengan `data` berisi `{ field: pesan }`, termasuk email yang sudah
  terdaftar (`{ "email": "email sudah terdaftar" }`). Untuk melempar error per field dari service:
  `throw new BadRequestException({ message: 'Validation Failed', data: { field: 'pesan' } })`.
- Route yang tidak ada: 404 `Endpoint GET /api/v1/xxx tidak ditemukan`.
- Endpoint yang mengirim file mentah (`GET /files/:id`, dst) tidak dibungkus.

List dengan pagination (`?page=0&size=10`, page mulai dari 0, size maksimal 100):

```json
{ "content": [ ... ], "page": { "size": 10, "number": 0, "total_elements": 25, "total_pages": 3 } }
```

### Auth

- Login / register / refresh mengembalikan `{ access_token, user }` di body, refresh token di cookie httpOnly
  `refresh_token`. Umur cookie sama dengan umur refresh token (`JWT_REFRESH_EXPIRES_IN`).
- Login, refresh, dan logout membalas 200. Register membalas 201.
- Kirim access token di header `Authorization: Bearer <access_token>`.
- Setiap token membawa claim `type` (`access` / `refresh`). Access token ditolak di `/auth/refresh`, refresh token
  ditolak sebagai access token.
- Semua endpoint wajib login kecuali `@Public()`. `@Roles(...)` cukup salah satu role, `@Permissions(...)` wajib semua.

### Tanggal & waktu

- Kejadian (`created_at`, `updated_at`, `completed_at`) disimpan dalam **UTC** (TypeORM `timezone: 'Z'`) dan dikirim
  sebagai ISO, mis. `"2026-09-28T05:59:21.953Z"`. Frontend yang menampilkannya sesuai zona waktu browser.
- Tanggal kalender (tanggal lahir, cuti, dll) pakai kolom `date` dan dikirim sebagai string `"YYYY-MM-DD"`, jangan
  diubah jadi datetime.
- Perbandingan dengan "hari ini" (kedaluwarsa, terlambat) dihitung di aplikasi dengan zona waktu bisnis yang jelas,
  bukan `NOW()` / `CURDATE()` di SQL.

### Endpoint

Semua endpoint diawali `/api/v1`.

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/auth/register` | Public | Daftar user baru |
| POST | `/auth/login` | Public | Login, access token di body, refresh token di cookie |
| PATCH | `/auth/refresh` | Cookie refresh token | Refresh access token |
| POST | `/auth/logout` | Public | Hapus cookie refresh token |
| GET | `/roles`, `/roles/:id`, `/permissions` | `roles:read` | List / detail role & permission |
| PATCH | `/roles/:id/permissions` | `roles:update` | Ganti permission role (`{ "permission_ids": [...] }`) |
| GET | `/users?page=&size=&search=`, `/users/:id` | `users:read` | List / detail user |
| POST / PATCH / DELETE | `/users`, `/users/:id` | role `admin` + `users:create/update/delete` | Kelola user (delete = soft delete) |
| POST | `/files/store` | Login | Upload file (multipart, field `files`) |
| GET | `/files/:id`, `/files/:id/signed-url` | Login | Isi file / signed URL sementara (2 menit) |
| GET | `/files/public/:id`, `/files/public/:id/data` | Public | File berstatus `public` |
| GET | `/files/signed/:id` | Signature valid | Akses file lewat signed URL |
| GET / POST / PATCH / DELETE | `/todos?page=&size=&search=&is_completed=`, `/todos/:id` | Login | Todo milik sendiri (`is_completed` hanya `true` / `false`) |

## Setup

Prasyarat: Node.js 20+, pnpm, MySQL, Redis.

```bash
pnpm install
cp .env.example .env   # lalu sesuaikan
pnpm start:dev         # http://localhost:3000
pnpm seed              # role, permission, user admin (sekali saja, aman diulang)
```

User admin default: **`admin@example.com` / `admin12345`**.

| Variable | Keterangan |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | Koneksi MySQL |
| `JWT_SECRET` | **Wajib diganti** sebelum production |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Umur access token (`15m`) dan refresh token (`7d`) |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `CACHE_TTL` | Koneksi Redis dan TTL default cache (detik) |
| `THROTTLE_TTL`, `THROTTLE_LIMIT` | Rate limit: jumlah request per sekian detik |
| `APP_URL` | Base URL aplikasi (untuk signed URL file) |
| `FILE_TEMP_DIR`, `FILE_STORAGE_DIR` | Folder penyimpanan file upload |
| `SIGNED_URL_SECRET` | **Wajib diganti** sebelum production |

> Tabel dibuat otomatis lewat `synchronize` selama `NODE_ENV` bukan `production`. Database (`DB_DATABASE`) harus sudah
> dibuat di MySQL. Di production pakai migration TypeORM.

## Menambah fitur baru

Contoh fitur `units`: salin pola `modules/todos/`.

```ts
// dto/create-unit.dto.ts
export class CreateUnitDto {
  @IsNotEmpty({ message: 'wajib diisi' })
  kode_unit: string;
}

// units.service.ts
@Injectable()
export class UnitsService {
  constructor(@InjectRepository(Unit) private readonly unitsRepository: Repository<Unit>) {}

  async findOne(id: string) {
    const unit = await this.unitsRepository.findOneBy({ id });
    if (!unit) throw new NotFoundException('Unit tidak ditemukan');
    return unit;
  }
}

// units.controller.ts
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Permissions('units:read')
  @ResponseMessage('Berhasil ambil data unit')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.unitsService.findOne(id);
  }
}
```

Lalu buat `UnitsModule` (`TypeOrmModule.forFeature([Unit])`) dan daftarkan di `app.module.ts`. Entity otomatis
terdaftar lewat `autoLoadEntities`.

## Testing

```bash
pnpm test          # unit test (service/controller di-mock, tidak butuh MySQL/Redis)
pnpm test:cov      # dengan coverage
```

## Deployment

- `NODE_ENV=production` → `synchronize` mati dan cookie refresh token otomatis `secure`.
- Ganti `JWT_SECRET` dan `SIGNED_URL_SECRET` dari nilai default.
