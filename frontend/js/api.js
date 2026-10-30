/**
 * Air Quality and Pollution Pattern Analysis (DA-013)
 * API Service Client Module (api.js)
 * 
 * ARCHITECTURE OVERVIEW:
 * Seamlessly interfaces the frontend UI with the Python Flask REST API:
 *   - Auto-detects Flask Backend on API_BASE_URL (http://127.0.0.1:5000/api).
 *   - Transparently handles the project response envelope: { success, data, message }.
 *   - Falls back gracefully to built-in mock data if the backend is temporarily offline.
 *   - Provides real CSV upload, Pandas data-quality auditing, dynamic analytics,
 *     and Chart.js data generation when connected.
 */

const API_CONFIG = {
    BASE_URL: 'http://127.0.0.1:5000/api',
    TIMEOUT_MS: 3000,
    IS_BACKEND_AVAILABLE: false,
    ACTIVE_DATASET_ID: null
};

// ============================================================================
// EMBEDDED DEMO DATASET (High fidelity fallback when backend is offline)
// ============================================================================
const DEMO_METRIC_RECORDS = [
    { id: 1, date: "2024-01-01", city: "Metropolis", location: "Downtown Central", pm25: 42.5, pm10: 68.2, no2: 34.1, so2: 8.4, o3: 22.0, aqi: 118, status: "Moderate" },
    { id: 2, date: "2024-01-01", city: "Metropolis", location: "Industrial Zone North", pm25: 78.3, pm10: 135.0, no2: 52.4, so2: 18.7, o3: 15.2, aqi: 163, status: "Unhealthy" },
    { id: 3, date: "2024-01-01", city: "Metropolis", location: "Suburbia East", pm25: 18.2, pm10: 32.4, no2: 14.6, so2: 3.1, o3: 38.5, aqi: 64, status: "Moderate" },
    { id: 4, date: "2024-01-01", city: "Harbor City", location: "Harbor Portside", pm25: 55.0, pm10: 92.6, no2: 41.2, so2: 12.5, o3: 28.4, aqi: 149, status: "Unhealthy for Sensitive Groups" },
    { id: 5, date: "2024-01-01", city: "Green Valley", location: "Valley Park Eco-Reserve", pm25: 11.4, pm10: 21.0, no2: 8.2, so2: 1.8, o3: 44.1, aqi: 48, status: "Good" },

    { id: 6, date: "2024-01-02", city: "Metropolis", location: "Downtown Central", pm25: 45.1, pm10: 72.4, no2: 36.5, so2: 9.1, o3: 20.5, aqi: 124, status: "Moderate" },
    { id: 7, date: "2024-01-02", city: "Metropolis", location: "Industrial Zone North", pm25: 84.6, pm10: 142.8, no2: 56.0, so2: 21.3, o3: 14.0, aqi: 166, status: "Unhealthy" },
    { id: 8, date: "2024-01-02", city: "Metropolis", location: "Suburbia East", pm25: 19.5, pm10: 34.0, no2: 15.2, so2: 3.4, o3: 36.8, aqi: 66, status: "Moderate" },
    { id: 9, date: "2024-01-02", city: "Harbor City", location: "Harbor Portside", pm25: 58.3, pm10: 96.0, no2: 43.8, so2: 13.2, o3: 27.1, aqi: 152, status: "Unhealthy" },
    { id: 10, date: "2024-01-02", city: "Green Valley", location: "Valley Park Eco-Reserve", pm25: 12.0, pm10: 22.5, no2: 8.9, so2: 1.9, o3: 42.6, aqi: 50, status: "Good" },

    { id: 11, date: "2024-01-03", city: "Metropolis", location: "Downtown Central", pm25: 51.8, pm10: 81.2, no2: 39.0, so2: 10.5, o3: 19.2, aqi: 142, status: "Unhealthy for Sensitive Groups" },
    { id: 12, date: "2024-01-03", city: "Metropolis", location: "Industrial Zone North", pm25: 92.1, pm10: 155.4, no2: 61.2, so2: 24.0, o3: 12.8, aqi: 170, status: "Unhealthy" },
    { id: 13, date: "2024-01-03", city: "Metropolis", location: "Suburbia East", pm25: 22.4, pm10: 38.7, no2: 16.8, so2: 3.9, o3: 34.2, aqi: 72, status: "Moderate" },
    { id: 14, date: "2024-01-03", city: "Harbor City", location: "Harbor Portside", pm25: 63.7, pm10: 104.2, no2: 46.5, so2: 14.8, o3: 25.0, aqi: 155, status: "Unhealthy" },
    { id: 15, date: "2024-01-03", city: "Green Valley", location: "Valley Park Eco-Reserve", pm25: 13.5, pm10: 24.1, no2: 9.4, so2: 2.1, o3: 41.0, aqi: 53, status: "Moderate" },

    { id: 16, date: "2024-02-10", city: "Metropolis", location: "Downtown Central", pm25: 58.4, pm10: 94.1, no2: 45.2, so2: 12.8, o3: 18.4, aqi: 153, status: "Unhealthy" },
    { id: 17, date: "2024-02-10", city: "Metropolis", location: "Industrial Zone North", pm25: 108.2, pm10: 186.4, no2: 68.9, so2: 29.4, o3: 11.2, aqi: 179, status: "Unhealthy" },
    { id: 18, date: "2024-02-10", city: "Metropolis", location: "Suburbia East", pm25: 25.6, pm10: 44.2, no2: 18.4, so2: 4.2, o3: 32.0, aqi: 79, status: "Moderate" },
    { id: 19, date: "2024-02-10", city: "Harbor City", location: "Harbor Portside", pm25: 72.1, pm10: 120.5, no2: 51.0, so2: 17.5, o3: 22.6, aqi: 160, status: "Unhealthy" },
    { id: 20, date: "2024-02-10", city: "Green Valley", location: "Valley Park Eco-Reserve", pm25: 14.2, pm10: 26.0, no2: 10.1, so2: 2.3, o3: 39.4, aqi: 55, status: "Moderate" }
];

// ============================================================================
// API CLIENT OBJECT
// ============================================================================
const ApiService = {
    /**
     * Check if the real Flask backend server is currently reachable.
     */
    async checkBackendHealth() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

            const response = await fetch(`${API_CONFIG.BASE_URL}/health`, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const res = await response.json();
                API_CONFIG.IS_BACKEND_AVAILABLE = true;
                if (res.data?.activeDatasetId) {
                    API_CONFIG.ACTIVE_DATASET_ID = res.data.activeDatasetId;
                }
                return {
                    connected: true,
                    message: "Connected to Python Flask Backend (Port 5000)",
                    datasetId: API_CONFIG.ACTIVE_DATASET_ID
                };
            }
        } catch (e) {
            API_CONFIG.IS_BACKEND_AVAILABLE = false;
        }

        return {
            connected: false,
            message: "Running in Frontend Standalone Mode (Demo Data Active)"
        };
    },

    /**
     * Upload a CSV dataset file to Flask backend
     * @param {File} file 
     * @param {Function} onProgress
     */
    async uploadCSV(file, onProgress) {
        if (!file) throw new Error("No file provided for upload.");
        if (!file.name.toLowerCase().endsWith('.csv')) {
            throw new Error("Invalid file format. Only Comma-Separated Values (.csv) are accepted.");
        }

        if (onProgress) onProgress(20);

        if (API_CONFIG.IS_BACKEND_AVAILABLE) {
            try {
                if (onProgress) onProgress(45);
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch(`${API_CONFIG.BASE_URL}/upload`, {
                    method: 'POST',
                    body: formData
                });

                if (onProgress) onProgress(85);

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.message || `Server returned error status ${response.status}`);
                }

                const resJson = await response.json();
                const result = resJson.data || resJson;
                API_CONFIG.ACTIVE_DATASET_ID = result.datasetId;

                if (onProgress) onProgress(100);

                return {
                    success: true,
                    isDemo: false,
                    datasetId: result.datasetId,
                    filename: result.filename,
                    totalRecords: result.totalRecords,
                    locationsCount: result.locationsCount,
                    locations: result.locations,
                    cities: result.cities,
                    pollutantsAvailable: result.pollutantsAvailable,
                    dateRange: result.dateRange,
                    completenessRate: result.completenessRate,
                    message: resJson.message || "File uploaded and processed by Flask Backend."
                };
            } catch (err) {
                console.warn("Backend upload failed, continuing in simulation fallback.", err);
                throw err;
            }
        }

        // Frontend Simulation Fallback when Flask is disconnected
        return new Promise((resolve) => {
            let progress = 20;
            const interval = setInterval(() => {
                progress += 25;
                if (onProgress) onProgress(Math.min(progress, 100));

                if (progress >= 100) {
                    clearInterval(interval);
                    resolve({
                        success: true,
                        isDemo: true,
                        message: "File loaded into local session memory. (Flask backend offline)",
                        filename: file.name,
                        size: file.size,
                        totalRecords: 2450,
                        locationsCount: 5,
                        locations: ["Downtown Central", "Industrial Zone North", "Suburbia East", "Harbor Portside", "Valley Park Eco-Reserve"],
                        cities: ["Metropolis", "Harbor City", "Green Valley"],
                        pollutantsAvailable: ["PM2.5", "PM10", "NO2", "SO2", "O3"],
                        dateRange: { start: "2024-01-01", end: "2024-12-31" },
                        completenessRate: "96.6%"
                    });
                }
            }, 100);
        });
    },

    /**
     * Retrieve metadata about the loaded dataset
     */
    async getDatasetInfo() {
        if (API_CONFIG.IS_BACKEND_AVAILABLE) {
            try {
                const url = API_CONFIG.ACTIVE_DATASET_ID 
                    ? `${API_CONFIG.BASE_URL}/dataset/${API_CONFIG.ACTIVE_DATASET_ID}/info`
                    : `${API_CONFIG.BASE_URL}/dataset/info`;

                const res = await fetch(url);
                if (res.ok) {
                    const json = await res.json();
                    const data = json.data || json;
                    return {
                        isDemo: false,
                        ...data
                    };
                }
            } catch (e) {
                console.warn("Backend getDatasetInfo failed, falling back to mock.", e);
            }
        }

        // High-fidelity mock response
        return {
            isDemo: true,
            totalRecords: 2450,
            locationsCount: 5,
            locations: [
                "Downtown Central",
                "Industrial Zone North",
                "Suburbia East",
                "Harbor Portside",
                "Valley Park Eco-Reserve"
            ],
            cities: ["Metropolis", "Harbor City", "Green Valley"],
            pollutantsAvailable: ["PM2.5", "PM10", "NO2", "SO2", "O3"],
            dateRange: {
                start: "2024-01-01",
                end: "2024-12-31"
            },
            completenessRate: "96.6%"
        };
    },

    /**
     * Retrieve paginated and filtered data records
     * @param {Object} params { search, city, location, page, limit, sortColumn, sortDir }
     */
    async getCleanedRecords(params = {}) {
        if (API_CONFIG.IS_BACKEND_AVAILABLE) {
            try {
                const query = new URLSearchParams(params).toString();
                const url = API_CONFIG.ACTIVE_DATASET_ID
                    ? `${API_CONFIG.BASE_URL}/dataset/${API_CONFIG.ACTIVE_DATASET_ID}/preview?${query}`
                    : `${API_CONFIG.BASE_URL}/dataset/preview?${query}`;

                const res = await fetch(url);
                if (res.ok) {
                    const json = await res.json();
                    const data = json.data || json;
                    return {
                        isDemo: false,
                        total: data.total,
                        page: data.page,
                        limit: data.limit,
                        totalPages: data.totalPages,
                        data: data.data || []
                    };
                }
            } catch (e) {
                console.warn("Backend getCleanedRecords failed, falling back to mock.", e);
            }
        }

        // Mock pagination and filtering engine
        let records = [...DEMO_METRIC_RECORDS];

        if (params.search) {
            const s = params.search.toLowerCase();
            records = records.filter(r =>
                r.city.toLowerCase().includes(s) ||
                r.location.toLowerCase().includes(s) ||
                r.date.includes(s) ||
                r.status.toLowerCase().includes(s)
            );
        }

        if (params.city && params.city !== 'All') {
            records = records.filter(r => r.city === params.city);
        }

        if (params.location && params.location !== 'All') {
            records = records.filter(r => r.location === params.location);
        }

        if (params.sortColumn) {
            const col = params.sortColumn;
            const dir = params.sortDir === 'desc' ? -1 : 1;
            records.sort((a, b) => {
                if (a[col] < b[col]) return -1 * dir;
                if (a[col] > b[col]) return 1 * dir;
                return 0;
            });
        }

        const total = records.length;
        const page = parseInt(params.page || 1, 10);
        const limit = parseInt(params.limit || 10, 10);
        const startIndex = (page - 1) * limit;
        const pagedData = records.slice(startIndex, startIndex + limit);

        return {
            isDemo: true,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
            data: pagedData
        };
    },

    /**
     * Request data quality audit statistics
     */
    async getDataQualityStats() {
        if (API_CONFIG.IS_BACKEND_AVAILABLE) {
            try {
                const url = API_CONFIG.ACTIVE_DATASET_ID
                    ? `${API_CONFIG.BASE_URL}/dataset/${API_CONFIG.ACTIVE_DATASET_ID}/quality`
                    : `${API_CONFIG.BASE_URL}/data-quality`;

                const res = await fetch(url);
                if (res.ok) {
                    const json = await res.json();
                    const data = json.data || json;
                    return {
                        isDemo: false,
                        metrics: data.metrics,
                        columnBreakdown: data.columnBreakdown,
                        cleanSummary: data.cleanSummary
                    };
                }
            } catch (e) {
                console.warn("Backend getDataQualityStats failed, falling back to mock.", e);
            }
        }

        return {
            isDemo: true,
            metrics: {
                totalRowsScanned: 2450,
                missingValues: 84,
                missingPercentage: 3.4,
                duplicateRecords: 12,
                duplicatePercentage: 0.5,
                invalidNumeric: 7,
                invalidDates: 0,
                healthScore: 96.1
            },
            columnBreakdown: [
                { column: "PM2.5", missing: 26, outOfRange: 3, rule: "Range (0-500 µg/m³), Impute Median" },
                { column: "PM10", missing: 31, outOfRange: 2, rule: "Range (0-1000 µg/m³), Impute Median" },
                { column: "NO2", missing: 14, outOfRange: 1, rule: "Range (0-300 ppb), Linear Interpolation" },
                { column: "SO2", missing: 8, outOfRange: 1, rule: "Range (0-200 ppb), Linear Interpolation" },
                { column: "O3", missing: 5, outOfRange: 0, rule: "Range (0-300 ppb), Forward-fill" }
            ],
            cleanSummary: "103 anomalies flagged. Cleaning strategy: Remove 12 exact duplicates, impute missing sensor measurements via temporal median, clamp negative values to 0.0."
        };
    },

    /**
     * Trigger dataset cleaning pipeline
     * @param {Object} options
     */
    async cleanDataset(options = {}) {
        if (API_CONFIG.IS_BACKEND_AVAILABLE) {
            try {
                const url = API_CONFIG.ACTIVE_DATASET_ID
                    ? `${API_CONFIG.BASE_URL}/dataset/${API_CONFIG.ACTIVE_DATASET_ID}/clean`
                    : `${API_CONFIG.BASE_URL}/data-quality/clean`;

                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        drop_duplicates: true,
                        drop_invalid_dates: true,
                        clamp_negative: true,
                        impute_method: options.impute_method || 'median'
                    })
                });

                if (res.ok) {
                    const json = await res.json();
                    return {
                        isDemo: false,
                        ...(json.data || json)
                    };
                }
            } catch (e) {
                console.warn("Backend cleanDataset failed, continuing in simulation.", e);
            }
        }

        return {
            isDemo: true,
            success: true,
            metrics: {
                initialRows: 2450,
                finalRows: 2438,
                duplicatesRemoved: 12,
                invalidDatesRemoved: 0,
                clampedValues: 7,
                imputedValues: 84,
                healthScore: 99.8
            },
            actions: [
                "Removed 12 duplicate records.",
                "Clamped 7 negative sensor readings to 0.0.",
                "Imputed 84 missing values using temporal median strategy."
            ]
        };
    },

    /**
     * Fetch descriptive pollution analysis metrics based on selected filters
     * @param {Object} filters { startDate, endDate, city, location, pollutant }
     */
    async getPollutionAnalysis(filters = {}) {
        if (API_CONFIG.IS_BACKEND_AVAILABLE) {
            try {
                const url = API_CONFIG.ACTIVE_DATASET_ID
                    ? `${API_CONFIG.BASE_URL}/dataset/${API_CONFIG.ACTIVE_DATASET_ID}/analysis`
                    : `${API_CONFIG.BASE_URL}/analysis/pollution`;

                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(filters)
                });

                if (res.ok) {
                    const json = await res.json();
                    return {
                        isDemo: false,
                        ...(json.data || json)
                    };
                }
            } catch (e) {
                console.warn("Backend getPollutionAnalysis failed, falling back to mock.", e);
            }
        }

        // Mock analysis calculations
        const pollutant = (filters.pollutant || 'pm25').toLowerCase().replace('.', '');
        let records = [...DEMO_METRIC_RECORDS];

        if (filters.city && filters.city !== 'All') {
            records = records.filter(r => r.city === filters.city);
        }
        if (filters.location && filters.location !== 'All') {
            records = records.filter(r => r.location === filters.location);
        }
        if (filters.startDate) {
            records = records.filter(r => r.date >= filters.startDate);
        }
        if (filters.endDate) {
            records = records.filter(r => r.date <= filters.endDate);
        }

        if (records.length === 0) {
            return {
                isDemo: true,
                count: 0,
                average: 0.0,
                max: 0.0,
                maxLocation: "N/A",
                maxDate: "N/A",
                min: 0.0,
                minLocation: "N/A",
                minDate: "N/A",
                unit: pollutant.includes('pm') ? 'µg/m³' : 'ppb',
                stationAverages: []
            };
        }

        const values = records.map(r => r[pollutant] !== undefined ? r[pollutant] : r.pm25);
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const maxVal = Math.max(...values);
        const minVal = Math.min(...values);

        const maxRecord = records.find(r => (r[pollutant] || r.pm25) === maxVal) || records[0];
        const minRecord = records.find(r => (r[pollutant] || r.pm25) === minVal) || records[0];

        const stationMap = {};
        records.forEach(r => {
            const loc = r.location;
            const val = r[pollutant] || r.pm25;
            if (!stationMap[loc]) stationMap[loc] = { sum: 0, count: 0, city: r.city };
            stationMap[loc].sum += val;
            stationMap[loc].count += 1;
        });

        const stationAverages = Object.keys(stationMap).map(loc => ({
            location: loc,
            city: stationMap[loc].city,
            average: parseFloat((stationMap[loc].sum / stationMap[loc].count).toFixed(1)),
            samples: stationMap[loc].count
        }));

        return {
            isDemo: true,
            count: records.length,
            average: parseFloat(avg.toFixed(1)),
            max: parseFloat(maxVal.toFixed(1)),
            maxLocation: `${maxRecord.location} (${maxRecord.city})`,
            maxDate: maxRecord.date,
            min: parseFloat(minVal.toFixed(1)),
            minLocation: `${minRecord.location} (${minRecord.city})`,
            minDate: minRecord.date,
            unit: pollutant.includes('pm') ? 'µg/m³' : 'ppb',
            stationAverages
        };
    },

    /**
     * Fetch formatted datasets for Chart.js visual rendering
     * @param {string} chartType ('line' | 'bar' | 'histogram' | 'scatter')
     * @param {Object} params
     */
    async getChartData(chartType, params = {}) {
        if (API_CONFIG.IS_BACKEND_AVAILABLE) {
            try {
                const query = new URLSearchParams({
                    type: chartType,
                    pollutant: params.pollutant || 'pm25'
                }).toString();

                const url = API_CONFIG.ACTIVE_DATASET_ID
                    ? `${API_CONFIG.BASE_URL}/dataset/${API_CONFIG.ACTIVE_DATASET_ID}/charts?${query}`
                    : `${API_CONFIG.BASE_URL}/charts/data?${query}`;

                const res = await fetch(url);
                if (res.ok) {
                    const json = await res.json();
                    return {
                        isDemo: false,
                        ...(json.data || json)
                    };
                }
            } catch (e) {
                console.warn("Backend getChartData failed, falling back to mock.", e);
            }
        }

        // Mock Chart data fallback
        switch (chartType) {
            case 'line':
                return {
                    isDemo: true,
                    labels: [
                        "2024-01-01", "2024-01-02", "2024-01-03", "2024-02-10",
                        "2024-03-15", "2024-04-20", "2024-05-25", "2024-06-18",
                        "2024-07-22", "2024-08-14", "2024-09-19", "2024-10-25",
                        "2024-11-15", "2024-12-20"
                    ],
                    datasets: [
                        {
                            label: "Downtown Central (PM2.5)",
                            data: [42.5, 45.1, 51.8, 58.4, 32.6, 28.4, 36.2, 48.5, 52.1, 44.0, 39.8, 47.5, 66.8, 72.4],
                            borderColor: "#10b981",
                            backgroundColor: "rgba(16, 185, 129, 0.12)"
                        },
                        {
                            label: "Industrial Zone (PM2.5)",
                            data: [78.3, 84.6, 92.1, 108.2, 60.2, 54.8, 68.4, 88.0, 95.4, 81.5, 74.2, 86.4, 124.5, 132.0],
                            borderColor: "#ef4444",
                            backgroundColor: "rgba(239, 68, 68, 0.12)"
                        },
                        {
                            label: "Valley Eco-Reserve (PM2.5)",
                            data: [11.4, 12.0, 13.5, 14.2, 9.1, 8.0, 10.2, 12.6, 14.0, 11.5, 10.0, 12.2, 17.5, 19.2],
                            borderColor: "#0284c7",
                            backgroundColor: "rgba(2, 132, 199, 0.12)"
                        }
                    ]
                };

            case 'bar':
                return {
                    isDemo: true,
                    labels: [
                        "Downtown Central",
                        "Industrial Zone North",
                        "Suburbia East",
                        "Harbor Portside",
                        "Valley Eco-Reserve"
                    ],
                    datasets: [
                        {
                            label: "PM2.5 Mean (µg/m³)",
                            data: [47.5, 87.6, 21.3, 59.8, 12.5],
                            backgroundColor: "#10b981"
                        },
                        {
                            label: "PM10 Mean (µg/m³)",
                            data: [76.9, 150.2, 36.8, 100.9, 23.3],
                            backgroundColor: "#0284c7"
                        },
                        {
                            label: "NO2 Mean (ppb)",
                            data: [38.2, 58.7, 15.6, 43.1, 8.9],
                            backgroundColor: "#f59e0b"
                        }
                    ]
                };

            case 'histogram':
                return {
                    isDemo: true,
                    labels: [
                        "0 - 12 (Good)",
                        "12.1 - 35.4 (Moderate)",
                        "35.5 - 55.4 (Unhealthy Sens.)",
                        "55.5 - 150.4 (Unhealthy)",
                        "150.5+ (Very Unhealthy)"
                    ],
                    datasets: [{
                        label: "Observation Frequency Count",
                        data: [412, 1180, 560, 275, 23],
                        backgroundColor: ["#10b981", "#facc15", "#f97316", "#ef4444", "#7c3aed"]
                    }]
                };

            case 'scatter':
                return {
                    isDemo: true,
                    correlationR: 0.88,
                    datasets: [{
                        label: "PM2.5 vs PM10 Measurements (µg/m³)",
                        data: DEMO_METRIC_RECORDS.map(r => ({ x: r.pm25, y: r.pm10 })),
                        backgroundColor: "rgba(16, 185, 129, 0.65)",
                        borderColor: "#059669"
                    }]
                };

            default:
                throw new Error(`Unsupported chart type: ${chartType}`);
        }
    },

    /**
     * Download Cleaned CSV File
     */
    async downloadCleanedCSV() {
        if (API_CONFIG.IS_BACKEND_AVAILABLE) {
            const url = API_CONFIG.ACTIVE_DATASET_ID
                ? `${API_CONFIG.BASE_URL}/dataset/${API_CONFIG.ACTIVE_DATASET_ID}/download`
                : `${API_CONFIG.BASE_URL}/export/csv`;

            window.location.href = url;
            return { success: true, method: "flask_direct" };
        }

        // Client-side CSV generation fallback
        const headers = ["Date", "City", "Monitoring_Location", "PM2.5", "PM10", "NO2", "SO2", "O3", "AQI_Status"];
        const rows = DEMO_METRIC_RECORDS.map(r =>
            `"${r.date}","${r.city}","${r.location}",${r.pm25},${r.pm10},${r.no2},${r.so2},${r.o3},"${r.status}"`
        );
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "cleaned_air_quality_da013.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return { success: true, isDemo: true, message: "Cleaned CSV generated via browser fallback." };
    },

    /**
     * Export Analytics Report
     */
    async exportReport(format = 'pdf') {
        if (API_CONFIG.IS_BACKEND_AVAILABLE && format === 'txt') {
            const url = API_CONFIG.ACTIVE_DATASET_ID
                ? `${API_CONFIG.BASE_URL}/dataset/${API_CONFIG.ACTIVE_DATASET_ID}/report/download`
                : `${API_CONFIG.BASE_URL}/export/report?format=txt`;

            window.location.href = url;
            return { success: true, method: "flask_direct" };
        }

        // Native browser print preview for clean PDF export
        window.print();
        return { success: true, message: "Browser print/export preview opened." };
    }
};

window.ApiService = ApiService;
window.API_CONFIG = API_CONFIG;
