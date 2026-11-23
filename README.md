# Smart Digital Clutter Cleaner

A local-first app that scans folders you choose, finds duplicates, large files, old downloads and temp files, and lets you reclaim space safely (quarantine or Recycle Bin, never automatic deletion). Your files never leave your computer.

**Status: Phase 3 started** (project setup, MySQL schema, React dashboard, and read-only folder scanner).

## Requirements
- Python 3.11+
- MySQL 8+
- Node.js 18+

## 1. Backend
```bash
# Create the database and user (edit the password in the file first)
mysql -u root -p < backend/setup_db.sql

cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env             # set DB_PASSWORD to match setup_db.sql
uvicorn main:app --reload --port 8000
```
- Health check: http://localhost:8000/api/health (expect `{"status":"ok","database":"connected"}`)
- API docs: http://localhost:8000/docs
- Tables and default settings are created automatically on first start.

## 2. Frontend
```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
```
The dev server proxies `/api` to the backend on port 8000. If the backend is not running, the dashboard shows **sample data under a visible "Demo data" banner** so you can preview the UI. With the backend running it shows your real disk usage; scan-based numbers stay at zero until the scanner (Phase 3) has produced a scan.

### Scanner (Phase 3)
- Open Smart Scanner from the sidebar and enter a local folder path, e.g. `C:\\Users\\YourName\\Downloads`.
- The API recursively reads file metadata, stores results in MySQL, and shows the 100 largest files.
- Large-file threshold is currently 500 MB; old Downloads threshold is 90 days.
- This first scanner runs synchronously, so start with a small folder. It skips common system/dependency folders and does not delete or modify files.

### Dashboard features
- Light theme by default, dark mode toggle (remembered), responsive with a collapsible sidebar and mobile drawer
- Animated disk gauge, count-up KPI tiles that link to their modules
- Recommendations you can open or dismiss (suggestions only, nothing is deleted from the dashboard)
- Storage-by-type donut (click the legend to hide types), folder bars, size distribution, and a cleanup/recovery chart with 7d / 30d / All filters
- Respects the OS "reduce motion" setting

## Project layout
| Path | Purpose |
|---|---|
| `backend/main.py` | FastAPI app, CORS, startup (creates tables) |
| `backend/config.py`, `database.py`, `models.py` | Settings, SQLAlchemy engine, 9 tables |
| `backend/routers/dashboard.py` | `GET /api/system/disk` (psutil), `GET /api/dashboard/summary` (latest scan, cleanup history) |
| `backend/services/`, `utils/` | Filled in by later phases |
| `frontend/src/navigation.js` | Sidebar + routes in one place |
| `frontend/src/layouts/` | `AppLayout`, `Sidebar`, `Topbar` |
| `frontend/src/pages/` | `Dashboard`, `ModulePlaceholder` (replaced module by module) |
| `frontend/src/components/` | `StatCard`, `StorageGauge`, `Recommendations`, `RecentScans`, `SectionCard`, ... |
| `frontend/src/charts/` | `TypeDonut`, `FolderBars`, `SizeDistribution`, `CleanupTrend` |
| `frontend/src/hooks/`, `services/`, `utils/` | Data loading, theme, API client, formatting |

## Roadmap
1. Setup, schema, DB connection (done)
2. React dashboard and navigation (done)
3. File-scanning engine
4. Duplicate and large-file detection
5. Old downloads and temp files
6. Smart Cleanup Center
7. FastAPI routers
8. MySQL persistence wiring
9. Analytics and PDF/CSV reports
10. AI categorization and similarity
11. Quarantine and recovery
12. Testing and optimization
