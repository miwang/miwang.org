# Student Batch Import & Migration

## 1) Data model (student)

Current recommended fields:

- `nameZh` (中文名)
- `nameEn` (英文名)
- `birthday` (`YYYY-MM-DD`, used for month/day display)
- `academicYear` (`25-26` / `26-27` / `27-28`)
- `className` (`elephant` / `tiger`)
- `avatar` (image)
- `name` (legacy compatibility fallback)

## 2) Configure current academic year

In Sanity Studio, open **🗓️ 当前学年设置** and set `currentAcademicYear`.
Daily practice birthday sync will only show students from that year.

## 3) Batch import roster + photos

Template file:

- `./tools/student_import_template.csv`

Required CSV columns:

`nameZh,nameEn,birthday,academicYear,className,photo`

Run:

```bash
cd /home/runner/work/miwang.org/miwang.org/miwang-cms

# 1) Dry run validation (no writes)
node tools/student_batch_import.mjs --csv ./tools/student_import_template.csv --photos ./static

# 2) Apply write (create/update docs + upload photos)
SANITY_API_TOKEN=your_token_here \
node tools/student_batch_import.mjs --csv ./your_students.csv --photos ./your_photos --apply

# Optional overrides (defaults already set for this project)
SANITY_PROJECT_ID=sow12t1i SANITY_DATASET=production SANITY_API_VERSION=2023-05-03
```

Behavior:

- Deduplicates identical rows in CSV.
- Validates required formats before write.
- Uses deterministic document IDs for repeatable re-runs.
- Upserts student docs and uploads mapped photos.

## 4) Migration notes for existing students

For old student docs that only have `name`:

1. Fill `nameZh` (or `nameEn`).
2. Fill `birthday`.
3. Keep `name` (legacy field) as fallback.

After migration, pages use `nameZh/nameEn` first and keep old data compatibility.

---

## 5) Extended student fields (v2 schema)

The `student` document now also supports:

| Field | Type | Description |
|---|---|---|
| `homeroomCode` | string | Raw homeroom number from roster, e.g. `"15"` (elephant) or `"17"` (tiger) |
| `status` | string | `active` / `inactive` / `graduated` — defaults to `active` |
| `notes` | text | Internal teacher notes (not public) |
| `importSource` | string | Auto-set by import tools, e.g. `"roster-import-2025-08-01"` |
| `lastImportedAt` | datetime | Auto-set timestamp of last import |

**Note:** `nameZh` and `avatar` are intentionally NOT imported from roster — you fill those manually.

---

## 6) Parent Contact Directory (private)

Parent contacts are stored in a separate `parentContact` document type, linked to `student` by reference.
This data is **never served via the public Sanity CDN** — it is only accessible through the server-side proxy.

### 6.1 Required Cloudflare Pages environment variables

Set these in **Cloudflare Pages → Settings → Environment Variables**:

| Variable | Description |
|---|---|
| `CONTACTS_PASSWORD` | Teacher password for the contacts directory (choose a strong password, not "5683") |
| `SANITY_API_TOKEN` | Sanity API token with **Editor** role (needed for both read and write operations) |

To create a Sanity API token: Sanity project → API → Tokens → Add token → "Editor".

### 6.2 Roster PDF Import workflow

1. Open **教师工具台** → **Roster 导入** card  
2. Log in with `CONTACTS_PASSWORD`  
3. Upload the year's roster PDF  
4. System extracts text with PDF.js (client-side, file never leaves the browser)  
5. Parser auto-detects: student name, homeroom (15 → elephant, 17 → tiger), phone numbers, emails  
6. Review the preview table — ⚠️ flags mark low-confidence rows  
7. Edit any incorrect fields directly in the table  
8. Click **确认导入** — server endpoint writes to Sanity (student docs + parentContact docs)  
9. Go back to **家长通讯录** to verify  
10. In Sanity Studio, open the student doc and add **中文名** and **头像**

### 6.3 API endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/contacts-login` | POST | Validates password, sets HttpOnly HMAC session cookie |
| `/api/contacts-data` | GET | Returns parentContact list (requires valid cookie + `SANITY_API_TOKEN`) |
| `/api/contacts-import` | POST | Writes student + parentContact docs (requires valid cookie + `SANITY_API_TOKEN`) |

Session tokens use HMAC-SHA256 keyed on `CONTACTS_PASSWORD` and expire at midnight UTC daily.

### 6.4 Security notes

- Parent contact data is served only via the server-side proxy `/api/contacts-data`; it is never returned by the public Sanity CDN endpoint even though it lives in the same `production` dataset.
- The `CONTACTS_PASSWORD` and `SANITY_API_TOKEN` are Cloudflare environment variables and never appear in client-side code.
- The session cookie is `HttpOnly; Secure; SameSite=Strict` — not accessible from JavaScript.
- For maximum security, consider migrating `parentContact` documents to a **private Sanity dataset** (requires Sanity Pro plan).
