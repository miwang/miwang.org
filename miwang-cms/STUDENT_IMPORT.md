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
