# Air Quality and Pollution Pattern Analysis (DA-013)
**Domain:** Environmental Analytics  
**Architecture:** Part 1 of 2 (Frontend Client & UI/UX Analytics Suite)

---

## 🌍 Project Purpose

The **Air Quality and Pollution Pattern Analysis (DA-013)** web application enables environmental analysts, researchers, and students to:
- Explore ambient air-quality measurements across multiple urban, industrial, and natural monitoring locations.
- Track temporal trajectories and compare pollutant concentrations (PM2.5, PM10, NO2, SO2, O3) over time.
- Identify extreme pollution spikes and investigate particulate relationships (e.g., PM2.5 vs. PM10 correlation).
- Audit data quality (missing values, duplicates, outliers) and run simulated data cleaning pipelines.
- Generate and export executive environmental analysis reports.

> **Mandatory Analytical Disclaimer:**  
> *"This application presents descriptive analysis of recorded measurements. Missing values are not treated as zero, and comparisons must account for measurement units, monitoring locations, and data quality. The results do not establish pollution causes or provide medical conclusions."*

---

## 🛠 Technology Stack

- **HTML5:** Semantic architecture, accessible landmarks (`<nav>`, `<aside>`, `<main>`, `<section>`).
- **CSS3:** Custom responsive layout system, CSS custom properties (variables), modern light/dark themes, and print-optimized export media query.
- **JavaScript (ES6+):** Modular, decoupled architecture separating UI logic (`app.js`), visualization pipelines (`charts.js`), and data layer (`api.js`).
- **Bootstrap 5.3 (CDN):** Responsive grid, accessible form controls, badges, and modals.
- **Chart.js 4.4 (CDN):** High-performance interactive visualizations (Line, Bar, Histogram, Scatter).
- **Font Awesome 6.5 (CDN):** Environmental and operational vector iconography.

---

## 📁 Project Directory Structure

```text
air-quality/
├── index.html                     # Root redirect entry point
├── README.md                      # Complete system documentation
└── frontend/
    ├── index.html                 # Main application dashboard interface
    ├── css/
    │   └── style.css              # Custom environmental theme, responsive layout & dark mode
    ├── js/
    │   ├── api.js                 # Abstracted API client & local mock engine
    │   ├── charts.js              # Chart.js visualization engine & theme synchronization
    │   └── app.js                 # UI/UX controller, routing, search/pagination, cleaning
    └── assets/
        └── sample_air_quality_data.csv   # Pre-packaged 2024 realistic air quality dataset
```

---

## 🚀 How to Run the Frontend Locally

No external build tools or node package installations are required! You can run the application using any of the following methods:

### Method 1: Direct Browser Launch (Simplest)
1. Navigate to the project directory: `c:\Users\HP\Desktop\air\air-quality\frontend\`.
2. Double-click **`index.html`** or right-click and choose **Open with > Google Chrome / Microsoft Edge / Mozilla Firefox**.
3. The dashboard will load immediately in **Demo Mode** with all charts, metrics, and navigation active.

### Method 2: Python Built-in HTTP Server
If Python is installed on your workstation:
```bash
# In the project root or frontend folder
cd c:\Users\HP\Desktop\air\air-quality\frontend
python -m http.server 8080
```
Open your browser at: `http://localhost:8080`

### Method 3: VS Code "Live Server" Extension
1. Open the `air-quality` folder in Visual Studio Code.
2. Right-click `frontend/index.html` and select **"Open with Live Server"**.
3. The app will launch with hot-reload enabled.

### Method 4: Node.js (npx serve or http-server)
```bash
npx serve c:\Users\HP\Desktop\air\air-quality\frontend
```

---

## 🖥 Application Layout & Features

### 1. Sidebar Navigation (Collapsible & Mobile Drawer)
- **Dashboard:** High-level summary cards (Total Records: 2,450; 5 Stations; 5 Pollutants; 2024 Continuous Range), station status breakdown, and system integrity indicator.
- **Upload Dataset:** Drag-and-drop CSV uploader with file validation, size computation, simulation progress bar, and 1-click **"Load Sample Data"** button.
- **Data Preview:** Interactive dataset table with live text search, city/station dropdown filtering, column-header sorting (click Date, City, Location, PM2.5, PM10, etc.), dynamic pagination, and buttons to inspect empty/loading states.
- **Data Cleaning:** Quality audit dashboard displaying missing values (84), duplicates (12), invalid numerics (7), and invalid dates (0); interactive **"Check Data Quality"**, **"Clean Dataset"**, and client-side **"Download Cleaned CSV"** buttons.
- **Pollution Analysis:** Parametric filters (Start/End Date, City, Location, Pollutant); dynamically computes Average Level, Maximum Level (with date/station), Minimum Level, and Sample Count with station intensity comparison bars.
- **Charts & Visualizations:** 4 interactive Chart.js charts:
  - **A. Line Chart:** Pollutant levels over time with multi-station trendlines and dynamic pollutant selector.
  - **B. Bar Chart:** Cross-location comparison of PM2.5, PM10, and NO2 means across 5 monitoring stations.
  - **C. Histogram:** Frequency distribution across AQI health risk intervals (Good, Moderate, Sensitive, Unhealthy, Hazardous).
  - **D. Scatter Plot:** Particulate matter correlation (PM2.5 vs PM10, \(r = 0.88\)).
  - Each chart includes a visible `[DEMO DATA]` badge and high-resolution **PNG download** button.
- **Reports:** Executive environmental findings, data quality summaries, and print-ready **"Export Report (PDF / Print)"** view.
- **About Project:** Project metadata, domain, scientific scope, two-part roadmap, and mandatory analytical disclaimer.

### 2. Top Navigation Bar
- **Project Logo & Code:** DA-013.
- **Backend Status Pill:** Displays *Demo Mode (Flask Disconnected)*; clicking opens a diagnostic modal with configured base URL and connection retesting.
- **Theme Toggle:** Smoothly switches between Light Mode (crisp emerald/slate) and Dark Mode (deep navy/slate). Persisted in `localStorage` and automatically updates Chart.js axis/grid colors.
- **User Profile:** Environmental Analyst identity badge.

---

## 🔌 Part 2 Backend Integration Specification

In Part 2, a Python Flask REST API will be integrated at:
```text
http://127.0.0.1:5000/api
```

The frontend file `frontend/js/api.js` is **pre-wired** for this backend. When the Flask server is online, the frontend automatically transitions from demo mode to live communication without changing any UI code.

### Expected Backend Endpoints Contract

| Method | Endpoint | Query / Body Payload | Response Description |
|---|---|---|---|
| `GET` | `/health` | None | Returns `{ status: "ok", service: "DA-013 Flask API" }` to verify connectivity. |
| `POST` | `/upload` | `multipart/form-data` with `file: <csv>` | Validates CSV headers, saves dataset to server session/storage, returns dataset metadata (`totalRows`, `columns`, `stations`). |
| `GET` | `/dataset/info` | None | Returns metadata summary (`totalRecords`, `locations`, `pollutantsAvailable`, `dateRange`, `completenessRate`). |
| `GET` | `/dataset/preview` | `?page=1&limit=10&search=&city=&location=&sortColumn=&sortDir=` | Returns paginated JSON records: `{ total, page, limit, totalPages, data: [...] }`. |
| `GET` | `/data-quality` | None | Runs Pandas data-quality audit, returns counts of missing values, duplicate rows, out-of-range numeric readings, and health score. |
| `POST` | `/data-quality/clean` | `{ strategy: "median", dropDuplicates: true, clampMin: 0 }` | Executes Pandas cleaning pipeline, imputes missing values, clamps negative values, returns cleaning summary. |
| `GET` | `/analysis/pollution` | `?startDate=&endDate=&city=&location=&pollutant=` | Returns computed descriptive metrics: `{ count, average, max, maxLocation, maxDate, min, minLocation, minDate, unit, stationAverages: [...] }`. |
| `GET` | `/charts/data` | `?type=line\|bar\|histogram\|scatter&pollutant=` | Returns structured Chart.js compatible payload (`labels`, `datasets`). |
| `GET` | `/export/csv` | None | Streams the cleaned dataset as a downloadable CSV attachment (`Content-Disposition: attachment; filename=cleaned_air_quality.csv`). |
| `GET` | `/export/report` | `?format=pdf\|json` | Generates and downloads a compiled analytical report. |

---

## 🧪 Environmental Reference Standards (WHO Guidelines)

| Pollutant | Chemical Formula | WHO 24-Hour Guideline | Primary Environmental Source |
|---|---|---|---|
| Fine Particulate Matter | **PM2.5** | \(15\ \mu\text{g/m}^3\) | Combustion engines, industrial emissions, power generation |
| Coarse Particulate Matter | **PM10** | \(45\ \mu\text{g/m}^3\) | Construction dust, mechanical abrasion, windblown soil |
| Nitrogen Dioxide | **NO2** | \(25\ \text{ppb}\) (\(25\ \mu\text{g/m}^3\)) | Vehicle exhaust, thermal fuel burning |
| Sulfur Dioxide | **SO2** | \(40\ \text{ppb}\) (\(40\ \mu\text{g/m}^3\)) | Industrial coal/heavy fuel combustion, smelters |
| Ground-level Ozone | **O3** | \(50\ \text{ppb}\) (8-hour seasonal) | Secondary photochemical smog (UV + NOx + VOCs) |

---

## 👨‍💻 Deliverable Status

- [x] Complete, responsive HTML5 layout with Bootstrap 5.3 & custom styling.
- [x] Clean CSS3 design system with light/dark theme toggle and smooth transitions.
- [x] Modular JavaScript architecture (`api.js`, `charts.js`, `app.js`).
- [x] Four responsive Chart.js visualizations (Line, Bar, Histogram, Scatter) with PNG export.
- [x] Full UI interactions: sidebar routing, search, pagination, sorting, audit simulation.
- [x] Comprehensive sample dataset (`sample_air_quality_data.csv`).
- [x] Ready for Part 2 Flask backend connection.
