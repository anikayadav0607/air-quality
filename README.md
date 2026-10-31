# Air Quality and Pollution Pattern Analysis (DA-013)
**Domain:** Environmental Analytics  
**Architecture:** Full-Stack Web Application (HTML5/Bootstrap 5 Frontend + Python 3 Flask REST API)

---

## 🌍 Project Purpose & Scope

The **Air Quality and Pollution Pattern Analysis (DA-013)** platform enables environmental analysts, researchers, municipal planners, and students to:
- Ingest and normalize public sensor datasets across diverse monitoring locations (urban, industrial, suburban, ecological reserves).
- Audit data quality by distinguishing between true missing values (`NaN`), recorded zeros (`0.0`), and out-of-physical-range readings.
- Execute configurable, non-destructive data cleaning pipelines (deduplication, date parsing, negative clamping, temporal median imputation).
- Compute descriptive statistical metrics (mean, median, min, max, variance) filtered by date, city, monitoring station, and pollutant species (PM2.5, PM10, NO2, SO2, O3).
- Visualize pollution patterns through interactive Chart.js visualizations (Line trends, Station comparison bars, Frequency histograms, and PM2.5 vs PM10 scatter correlations).
- Generate and download executive environmental analysis reports and cleaned CSV files.

> **Mandatory Analytical Disclaimer:**  
> *"This application presents descriptive analysis of recorded measurements. Missing values are not treated as zero, and comparisons must account for measurement units, monitoring locations, and data quality. The results do not establish pollution causes or provide medical conclusions."*

---

## 🛠 Technology Stack

### Backend Stack
- **Python 3:** Core programming language
- **Flask (3.1+):** Micro web framework providing modular REST API endpoints
- **Flask-CORS (6.0+):** Cross-Origin Resource Sharing for decoupled client communication
- **Pandas (3.1+):** High-performance tabular data ingestion, quality auditing, time-series parsing, and cleaning
- **NumPy (2.5+):** Numerical operations, array transformations, and Pearson correlation coefficient calculation
- **Scikit-learn (1.4+):** Machine learning pipeline for multivariate outlier detection (`IsolationForest`), station risk clustering (`KMeans`), and temporal trend forecasting (`LinearRegression`)
- **python-dateutil:** Robust ISO-8601 and heterogeneous date format parsing
- **unittest:** Built-in Python automated testing framework

### Frontend Stack
- **HTML5:** Semantic architecture with accessible landmarks (`<header>`, `<nav>`, `<aside>`, `<main>`, `<section>`)
- **CSS3:** Custom responsive layout system, CSS custom properties (variables), light and dark mode palettes, and print stylesheet
- **Bootstrap 5.3 (CDN):** Responsive grid layout, modals, badges, and accessible forms
- **Vanilla JavaScript (ES6+):** Decoupled architecture separating API communication (`api.js`), chart rendering (`charts.js`), and UI controller logic (`app.js`)
- **Chart.js 4.4 (CDN):** Canvas-based interactive data visualizations with theme adaptation and PNG export
- **Font Awesome 6.5 (CDN):** Environmental and operational vector iconography

---

## 📁 System Architecture & Directory Structure

```text
air-quality/
├── index.html                                 # Root redirect entry point
├── README.md                                  # Complete system documentation & API reference
│
├── frontend/                                  # Presentation Layer (Client)
│   ├── index.html                             # Single Page Application (SPA) dashboard interface
│   ├── css/
│   │   └── style.css                          # Environmental design system & dark theme styles
│   ├── js/
│   │   ├── api.js                             # API service client with auto-detection & mock fallback
│   │   ├── charts.js                          # Chart.js visualization manager & theme adapter
│   │   └── app.js                             # UI controller, routing, search, pagination, and audit
│   └── assets/
│       └── sample_air_quality_data.csv        # Pre-packaged 2024 realistic air quality dataset
│
└── backend/                                   # Application & Analytics Layer (Server)
    ├── app.py                                 # Flask entry point, routing, and centralized error handling
    ├── config.py                              # Centralized configuration parameters and thresholds
    ├── requirements.txt                       # Python dependencies specification
    ├── services/                              # Core business logic and analytics services
    │   ├── __init__.py
    │   ├── data_loader.py                     # CSV ingestion, header normalization, and preview pagination
    │   ├── data_cleaner.py                    # Quality audit engine and cleaning pipeline (IsolationForest outlier filter)
    │   ├── analytics.py                       # Descriptive statistics and station aggregations
    │   ├── ml_service.py                      # Scikit-learn ML (IsolationForest, KMeans, LinearRegression, persistence)
    │   ├── chart_service.py                   # Chart.js JSON data transformation engine
    │   └── report_service.py                  # Executive report generation (JSON, TXT, CSV)
    ├── uploads/                               # Secure temporary storage for uploaded datasets
    ├── outputs/                               # Generated cleaned CSVs, persistent analysis JSONs, and text reports
    └── tests/                                 # Automated test suite
        ├── __init__.py
        └── test_backend.py                    # Comprehensive test cases covering all 17 core workflows
```

---

## ⚡ How to Run the Complete Application Locally

Follow these straightforward steps to run the Flask backend and the frontend on any standard laptop.

### Step 1: Set Up & Start the Python Backend

1. Open PowerShell or Command Prompt and navigate to the project directory:
   ```powershell
   cd "c:\Users\HP\Desktop\air\air-quality"
   ```

2. Activate the pre-configured virtual environment:
   ```powershell
   # On Windows (PowerShell):
   .\backend\.venv\Scripts\Activate.ps1

   # Or in Command Prompt:
   backend\.venv\Scripts\activate.bat
   ```

   *(Note: If you are setting up on a fresh machine without `.venv`, simply run `pip install -r backend/requirements.txt`)*

3. Start the Flask server:
   ```powershell
   python backend\app.py
   ```

   The server will start at:
   ```text
   * Running on http://127.0.0.1:5000/api
   ```

### Step 2: Open the Frontend

You can open the frontend in any web browser:

- **Direct Open:** Double-click [`frontend/index.html`](file:///c:/Users/HP/Desktop/air/air-quality/frontend/index.html) or open [`index.html`](file:///c:/Users/HP/Desktop/air/air-quality/index.html).
- **Or via VS Code Live Server:** Right-click `frontend/index.html` and click **"Open with Live Server"**.

As soon as the page loads, the top navigation bar will show:
```text
✔ Flask Backend Live (Port 5000)
```
And all KPI cards, tables, charts, and quality panels will immediately reflect real computations performed by the Python backend!

---

## 🧪 Running Automated Tests

A comprehensive test suite is provided in `backend/tests/test_backend.py`. To run the tests:

```powershell
# Navigate to the project root with the virtual environment activated:
python -m unittest discover -s backend/tests -p "test_*.py"
```

### Verified Test Cases
1. `test_01_health_check`: Verifies the `/api/health` heartbeat endpoint.
2. `test_02_default_sample_dataset_info`: Verifies preloaded sample metadata on startup.
3. `test_03_valid_csv_upload`: Tests multipart upload, header normalization, and schema registration.
4. `test_04_invalid_file_extension`: Tests rejection of non-CSV files (`.exe`, `.txt`).
5. `test_05_empty_dataset_rejection`: Tests graceful handling of zero-byte files.
6. `test_06_data_preview_and_sorting`: Tests pagination, column sorting, and dynamic AQI calculation.
7. `test_07_data_quality_audit`: Tests detection of missing values, duplicates, and out-of-range sensor values.
8. `test_08_data_cleaning_pipeline`: Tests deduplication, negative clamping, and median imputation.
9. `test_09_descriptive_analysis_with_filters`: Tests mean, median, min, max, and station grouping.
10. `test_10_charts_generation`: Tests generation of all 4 Chart.js charts (Line, Bar, Histogram, Scatter).
11. `test_11_cleaned_csv_download`: Tests streaming of cleaned CSV attachments.
12. `test_12_executive_report_generation`: Tests generation of structured JSON and downloadable text reports.
13. `test_13_sklearn_outlier_detection`: Tests Scikit-learn IsolationForest multivariate outlier detection.
14. `test_14_sklearn_station_clustering`: Tests Scikit-learn KMeans station environmental risk clustering.
15. `test_15_sklearn_trend_forecasting`: Tests Scikit-learn LinearRegression temporal trend and projection.
16. `test_16_persistent_analysis_storage`: Tests persistent disk storage and retrieval of full analysis snapshots.
17. `test_17_cleaning_with_outlier_filtering`: Tests pipeline deduplication, negative clamping, median imputation, and Scikit-learn outlier filtering.

---

## 📡 REST API Endpoint Specification

All endpoints are hosted under base path `http://127.0.0.1:5000/api`.

All responses follow a consistent JSON response envelope:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

| Method | Endpoint | Query / Body Parameters | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Checks service health and returns active dataset ID. |
| `POST` | `/api/upload` | `multipart/form-data` with `file: <csv>` | Ingests CSV, validates headers, and registers dataset. |
| `GET` | `/api/dataset/info` | Optional: `dataset_id` in path | Returns dataset metadata, station list, and completeness rate. |
| `GET` | `/api/dataset/preview` | `page`, `limit`, `search`, `city`, `location`, `sortColumn`, `sortDir` | Returns paginated rows with computed AQI categories. |
| `GET` | `/api/data-quality` | Optional: `dataset_id` in path | Audits missing values, duplicates, recorded zeros, and health score. |
| `POST` | `/api/data-quality/clean` | JSON: `{ "impute_method": "median", "filter_outliers": true }` | Cleans dataset and saves cleaned CSV. |
| `POST` | `/api/analysis/pollution`| JSON or Query: `{ "pollutant": "pm25", "city": "All", "location": "All", "startDate": "...", "endDate": "..." }` | Calculates descriptive statistics and station averages. |
| `GET/POST` | `/api/ml/outliers` | `contamination=0.05` | Scikit-learn IsolationForest multivariate anomaly detection. |
| `GET/POST` | `/api/ml/clusters` | `clusters=3` | Scikit-learn KMeans unsupervised station risk clustering. |
| `GET/POST` | `/api/ml/trend` | `pollutant=pm25`, `days=5` | Scikit-learn LinearRegression trend modeling and projections. |
| `POST` | `/api/analysis/persist` | JSON: `{ "notes": "..." }` | Persists comprehensive analysis snapshot to disk storage. |
| `GET` | `/api/analysis/persistent` | Optional: `dataset_id` in path | Retrieves persisted analysis records from disk/memory. |
| `GET` | `/api/charts/data` | `type=line\|bar\|histogram\|scatter`, `pollutant=pm25` | Returns Chart.js structured datasets. |
| `GET` | `/api/export/csv` | None | Streams downloadable cleaned CSV file. |
| `GET` | `/api/export/report` | `format=json\|txt` | Returns executive report as JSON or downloadable text file. |
| `GET` | `/api/dataset/<id>/report/download` | None | Downloads executive text report file. |

---

## 📝 Example CSV Dataset Format

The system accepts standard comma-separated values (`.csv`) with automatic column name normalization:

```csv
Date,City,Monitoring_Location,PM2.5,PM10,NO2,SO2,O3
2024-01-01,Metropolis,Downtown Central,42.5,68.2,34.1,8.4,22.0
2024-01-01,Metropolis,Industrial Zone North,78.3,135.0,52.4,18.7,15.2
2024-01-01,Metropolis,Suburbia East,18.2,32.4,14.6,3.1,38.5
2024-01-01,Harbor City,Harbor Portside,55.0,92.6,41.2,12.5,28.4
2024-01-01,Green Valley,Valley Park Eco-Reserve,11.4,21.0,8.2,1.8,44.1
```

### Supported Column Variations
- **Date:** `Date`, `date`, `timestamp`, `datetime`, `time`
- **Location:** `Monitoring_Location`, `location`, `station`, `monitoring_station`, `site`
- **City:** `City`, `city`, `region`, `area`
- **PM2.5:** `PM2.5`, `PM2_5`, `pm25`, `pm_25`, `particulate_matter_2.5`
- **PM10:** `PM10`, `pm10`, `pm_10`, `particulate_matter_10`
- **NO2:** `NO2`, `no2`, `no_2`, `nitrogen_dioxide`
- **SO2:** `SO2`, `so2`, `so_2`, `sulfur_dioxide`
- **O3:** `O3`, `o3`, `ozone`

---

## 💻 Example API Requests & Responses

### 1. Upload Dataset
**Request:**
```bash
curl -X POST http://127.0.0.1:5000/api/upload \
  -F "file=@frontend/assets/sample_air_quality_data.csv"
```

**Response (HTTP 201 Created):**
```json
{
  "success": true,
  "message": "File uploaded and registered successfully.",
  "data": {
    "datasetId": "48b0a9cd-c187-4632-9cb5-ef5647585093",
    "filename": "sample_air_quality_data.csv",
    "totalRecords": 85,
    "locationsCount": 5,
    "locations": [
      "Downtown Central",
      "Industrial Zone North",
      "Suburbia East",
      "Harbor Portside",
      "Valley Park Eco-Reserve"
    ],
    "cities": ["Metropolis", "Harbor City", "Green Valley"],
    "pollutantsAvailable": ["PM2.5", "PM10", "NO2", "SO2", "O3"],
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-12-20"
    },
    "completenessRate": "98.5%"
  }
}
```

### 2. Descriptive Pollution Analysis
**Request:**
```bash
curl -X POST http://127.0.0.1:5000/api/analysis/pollution \
  -H "Content-Type: application/json" \
  -d '{"pollutant": "pm25", "city": "Metropolis"}'
```

**Response (HTTP 200 OK):**
```json
{
  "success": true,
  "message": "Pollution analysis metrics computed.",
  "data": {
    "count": 51,
    "average": 52.8,
    "median": 48.5,
    "max": 132.0,
    "maxLocation": "Industrial Zone North (Metropolis)",
    "maxDate": "2024-12-20",
    "min": 13.6,
    "minLocation": "Suburbia East (Metropolis)",
    "minDate": "2024-04-20",
    "unit": "µg/m³",
    "pollutant": "pm25",
    "pollutantName": "PM2.5 (Fine Particulates)",
    "guidelineThreshold": 15.0,
    "stationAverages": [
      {
        "location": "Industrial Zone North",
        "city": "Metropolis",
        "average": 87.6,
        "samples": 17,
        "max": 132.0,
        "min": 54.8
      },
      {
        "location": "Downtown Central",
        "city": "Metropolis",
        "average": 48.2,
        "samples": 17,
        "max": 72.4,
        "min": 28.4
      },
      {
        "location": "Suburbia East",
        "city": "Metropolis",
        "average": 22.5,
        "samples": 17,
        "max": 33.0,
        "min": 13.6
      }
    ]
  }
}
```

### 3. Particulate Correlation (PM2.5 vs PM10)
**Request:**
```bash
curl -X GET "http://127.0.0.1:5000/api/charts/data?type=scatter"
```

**Response (HTTP 200 OK):**
```json
{
  "success": true,
  "message": "Scatter chart data generated.",
  "data": {
    "correlationR": 0.98,
    "datasets": [
      {
        "label": "Particulate Correlation (PM2.5 vs PM10, r = 0.98)",
        "data": [
          {"x": 42.5, "y": 68.2},
          {"x": 78.3, "y": 135.0},
          {"x": 18.2, "y": 32.4}
        ],
        "backgroundColor": "rgba(16, 185, 129, 0.65)",
        "borderColor": "#059669"
      }
    ]
  }
}
```

---

## 🔒 Security & Reliability Best Practices

1. **Path Traversal Protection:** All dataset operations use UUID-based dataset identifiers (`str(uuid.uuid4())`), preventing arbitrary file path manipulation.
2. **File Validation:** Files are verified for both extension (`.csv`) and parseable tabular structure via multi-encoding Pandas decoding.
3. **Restricted Payload Size:** Uploads are strictly capped at 16 MB (`MAX_CONTENT_LENGTH`).
4. **Safe Error Handling:** Centralized Flask error handlers intercept all exceptions, preventing server stack traces from leaking to API clients.
5. **Non-Destructive Processing:** The raw uploaded file is retained unmodified; cleaning pipelines generate new cleaned outputs in `backend/outputs/`.

---

## 👨‍💻 Deliverable Summary

- [x] Complete Flask REST API backend (`backend/app.py`).
- [x] Modular services: `data_loader.py`, `data_cleaner.py`, `analytics.py`, `chart_service.py`, `report_service.py`.
- [x] Unified JSON response envelope and centralized error handling.
- [x] Header normalization supporting heterogeneous column naming variations.
- [x] Data quality audit distinguishing missing values vs recorded zeros vs unparseable readings.
- [x] Configurable cleaning pipeline (deduplication, date parsing, clamping, median imputation).
- [x] Parametric descriptive analytics engine with WHO guideline thresholds.
- [x] Four Chart.js endpoints (Line, Bar, Histogram, Scatter with Pearson's \(r\)).
- [x] Cleaned CSV and executive text report export downloads.
- [x] Comprehensive 12-case test suite (`backend/tests/test_backend.py`) — **100% Passing**.
- [x] Seamless integration with the existing frontend.
