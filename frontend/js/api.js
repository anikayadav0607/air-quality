/**
 * Air Quality and Pollution Pattern Analysis (DA-013)
 * API Service Client Module (api.js)
 * 
 * ARCHITECTURE OVERVIEW:
 * This module cleanly decouples the UI layer from data sources.
 * In Part 1 (Current Stage):
 *   - Serves as the prepared client interface.
 *   - Gracefully detects if the Flask backend is running on API_BASE_URL.
 *   - Falls back to built-in realistic mock data when the backend is offline.
 * 
 * In Part 2 (Future Flask Integration):
 *   - Seamlessly connects to Flask endpoints without requiring changes to UI components.
 *   - Standard endpoints expected:
 *       GET  /health
 *       POST /upload
 *       GET  /dataset/info
 *       GET  /dataset/preview
 *       GET  /data-quality
 *       POST /data-quality/clean
 *       GET  /analysis/pollution
 *       GET  /charts/data
 *       GET  /export/csv
 *       GET  /export/report
 */

const API_CONFIG = {
    BASE_URL: 'http://127.0.0.1:5000/api',
    TIMEOUT_MS: 4000,
    IS_BACKEND_AVAILABLE: false
};

// ============================================================================
// EMBEDDED DEMO DATASET (High fidelity environmental records for Part 1)
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
    { id: 20, date: "2024-02-10", city: "Green Valley", location: "Valley Park Eco-Reserve", pm25: 14.2, pm10: 26.0, no2: 10.1, so2: 2.3, o3: 39.4, aqi: 55, status: "Moderate" },

    { id: 21, date: "2024-03-15", city: "Metropolis", location: "Downtown Central", pm25: 32.6, pm10: 54.1, no2: 26.8, so2: 5.9, o3: 35.2, aqi: 94, status: "Moderate" },
    { id: 22, date: "2024-03-15", city: "Metropolis", location: "Industrial Zone North", pm25: 60.2, pm10: 108.4, no2: 41.5, so2: 13.8, o3: 26.4, aqi: 154, status: "Unhealthy" },
    { id: 23, date: "2024-03-15", city: "Metropolis", location: "Suburbia East", pm25: 15.1, pm10: 28.0, no2: 11.4, so2: 2.2, o3: 46.0, aqi: 57, status: "Moderate" },
    { id: 24, date: "2024-03-15", city: "Harbor City", location: "Harbor Portside", pm25: 41.5, pm10: 72.0, no2: 32.0, so2: 8.6, o3: 38.0, aqi: 116, status: "Moderate" },
    { id: 25, date: "2024-03-15", city: "Green Valley", location: "Valley Park Eco-Reserve", pm25: 9.1, pm10: 17.5, no2: 6.2, so2: 1.3, o3: 52.1, aqi: 38, status: "Good" },

    { id: 26, date: "2024-04-20", city: "Metropolis", location: "Downtown Central", pm25: 28.4, pm10: 49.2, no2: 24.0, so2: 5.1, o3: 42.8, aqi: 85, status: "Moderate" },
    { id: 27, date: "2024-04-20", city: "Metropolis", location: "Industrial Zone North", pm25: 54.8, pm10: 98.6, no2: 38.2, so2: 11.9, o3: 32.0, aqi: 148, status: "Unhealthy for Sensitive Groups" },
    { id: 28, date: "2024-04-20", city: "Metropolis", location: "Suburbia East", pm25: 13.6, pm10: 25.4, no2: 10.2, so2: 2.0, o3: 51.2, aqi: 52, status: "Moderate" },
    { id: 29, date: "2024-04-20", city: "Harbor City", location: "Harbor Portside", pm25: 37.0, pm10: 66.8, no2: 29.5, so2: 7.9, o3: 45.4, aqi: 105, status: "Unhealthy for Sensitive Groups" },
    { id: 30, date: "2024-04-20", city: "Green Valley", location: "Valley Park Eco-Reserve", pm25: 8.0, pm10: 15.0, no2: 5.8, so2: 1.1, o3: 58.0, aqi: 33, status: "Good" },

    { id: 31, date: "2024-05-25", city: "Metropolis", location: "Downtown Central", pm25: 36.2, pm10: 59.8, no2: 29.1, so2: 6.5, o3: 48.6, aqi: 103, status: "Unhealthy for Sensitive Groups" },
    { id: 32, date: "2024-05-25", city: "Metropolis", location: "Industrial Zone North", pm25: 68.4, pm10: 119.2, no2: 46.0, so2: 15.4, o3: 36.2, aqi: 158, status: "Unhealthy" },
    { id: 33, date: "2024-05-25", city: "Metropolis", location: "Suburbia East", pm25: 16.8, pm10: 30.5, no2: 12.8, so2: 2.7, o3: 56.4, aqi: 61, status: "Moderate" },
    { id: 34, date: "2024-05-25", city: "Harbor City", location: "Harbor Portside", pm25: 46.2, pm10: 80.4, no2: 35.8, so2: 9.5, o3: 49.0, aqi: 127, status: "Moderate" },
    { id: 35, date: "2024-05-25", city: "Green Valley", location: "Valley Park Eco-Reserve", pm25: 10.2, pm10: 19.1, no2: 7.0, so2: 1.4, o3: 63.5, aqi: 43, status: "Good" },

    { id: 36, date: "2024-06-18", city: "Metropolis", location: "Downtown Central", pm25: 48.5, pm10: 79.0, no2: 38.6, so2: 9.2, o3: 58.4, aqi: 133, status: "Moderate" },
    { id: 37, date: "2024-06-18", city: "Metropolis", location: "Industrial Zone North", pm25: 88.0, pm10: 150.2, no2: 58.4, so2: 20.5, o3: 44.0, aqi: 168, status: "Unhealthy" },
    { id: 38, date: "2024-06-18", city: "Metropolis", location: "Suburbia East", pm25: 21.0, pm10: 37.8, no2: 15.9, so2: 3.6, o3: 67.2, aqi: 70, status: "Moderate" },
    { id: 39, date: "2024-06-18", city: "Harbor City", location: "Harbor Portside", pm25: 59.4, pm10: 101.5, no2: 44.0, so2: 13.0, o3: 55.8, aqi: 153, status: "Unhealthy" },
    { id: 40, date: "2024-06-18", city: "Green Valley", location: "Valley Park Eco-Reserve", pm25: 12.6, pm10: 23.4, no2: 8.5, so2: 1.7, o3: 74.2, aqi: 53, status: "Moderate" },

    { id: 41, date: "2024-07-22", city: "Metropolis", location: "Downtown Central", pm25: 52.1, pm10: 84.5, no2: 41.0, so2: 10.1, o3: 62.0, aqi: 143, status: "Unhealthy for Sensitive Groups" },
    { id: 42, date: "2024-07-22", city: "Metropolis", location: "Industrial Zone North", pm25: 95.4, pm10: 162.8, no2: 63.0, so2: 22.8, o3: 48.5, aqi: 172, status: "Unhealthy" },
    { id: 43, date: "2024-07-22", city: "Metropolis", location: "Suburbia East", pm25: 23.5, pm10: 41.0, no2: 17.2, so2: 3.9, o3: 71.0, aqi: 75, status: "Moderate" },
    { id: 44, date: "2024-07-22", city: "Harbor City", location: "Harbor Portside", pm25: 65.0, pm10: 110.0, no2: 47.8, so2: 14.5, o3: 60.2, aqi: 156, status: "Unhealthy" },
    { id: 45, date: "2024-07-22", city: "Green Valley", location: "Valley Park Eco-Reserve", pm25: 14.0, pm10: 25.8, no2: 9.1, so2: 1.9, o3: 79.5, aqi: 59, status: "Moderate" },

    { id: 46, date: "2024-11-15", city: "Metropolis", location: "Downtown Central", pm25: 66.8, pm10: 106.5, no2: 51.2, so2: 15.4, o3: 15.8, aqi: 157, status: "Unhealthy" },
    { id: 47, date: "2024-11-15", city: "Metropolis", location: "Industrial Zone North", pm25: 124.5, pm10: 214.0, no2: 76.8, so2: 34.2, o3: 9.2, aqi: 187, status: "Unhealthy" },
    { id: 48, date: "2024-11-15", city: "Metropolis", location: "Suburbia East", pm25: 30.4, pm10: 52.8, no2: 21.5, so2: 5.2, o3: 27.5, aqi: 89, status: "Moderate" },
    { id: 49, date: "2024-11-15", city: "Harbor City", location: "Harbor Portside", pm25: 84.0, pm10: 138.2, no2: 58.0, so2: 21.0, o3: 18.4, aqi: 166, status: "Unhealthy" },
    { id: 50, date: "2024-11-15", city: "Green Valley", location: "Valley Park Eco-Reserve", pm25: 17.5, pm10: 31.0, no2: 12.4, so2: 2.9, o3: 33.0, aqi: 62, status: "Moderate" },

    { id: 51, date: "2024-12-20", city: "Metropolis", location: "Downtown Central", pm25: 72.4, pm10: 115.0, no2: 55.0, so2: 17.0, o3: 13.5, aqi: 160, status: "Unhealthy" },
    { id: 52, date: "2024-12-20", city: "Metropolis", location: "Industrial Zone North", pm25: 132.0, pm10: 226.5, no2: 81.4, so2: 37.8, o3: 7.8, aqi: 191, status: "Unhealthy" },
    { id: 53, date: "2024-12-20", city: "Metropolis", location: "Suburbia East", pm25: 33.0, pm10: 57.4, no2: 23.6, so2: 5.8, o3: 24.0, aqi: 95, status: "Moderate" },
    { id: 54, date: "2024-12-20", city: "Harbor City", location: "Harbor Portside", pm25: 91.2, pm10: 149.0, no2: 62.5, so2: 23.5, o3: 15.2, aqi: 170, status: "Unhealthy" },
    { id: 55, date: "2024-12-20", city: "Green Valley", location: "Valley Park Eco-Reserve", pm25: 19.2, pm10: 34.0, no2: 13.8, so2: 3.2, o3: 30.1, aqi: 66, status: "Moderate" }
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
            const timeoutId = setTimeout(() => controller.abort(), 1200);

            const response = await fetch(`${API_CONFIG.BASE_URL}/health`, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                API_CONFIG.IS_BACKEND_AVAILABLE = true;
                return { connected: true, message: "Connected to Flask Backend (Port 5000)" };
            }
        } catch (e) {
            // Expected during Part 1 when backend is not yet started
            API_CONFIG.IS_BACKEND_AVAILABLE = false;
        }

        return {
            connected: false,
            message: "Running in Frontend Standalone Mode (Demo Data Active)"
        };
    },

    /**
     * Upload a CSV dataset file
     * Simulates client-side processing in Part 1; dispatches multipart/form-data to Flask in Part 2.
     * @param {File} file 
     * @param {Function} onProgress (progress percentage callback)
     */
    async uploadCSV(file, onProgress) {
        if (!file) throw new Error("No file provided for upload.");
        if (!file.name.toLowerCase().endsWith('.csv')) {
            throw new Error("Invalid file format. Only Comma-Separated Values (.csv) are accepted.");
        }

        // Check if real backend is available
        if (API_CONFIG.IS_BACKEND_AVAILABLE) {
            try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch(`${API_CONFIG.BASE_URL}/upload`, {
                    method: 'POST',
                    body: formData
                });
                if (!response.ok) throw new Error(`Server returned error ${response.status}`);
                return await response.json();
            } catch (err) {
                console.warn("Backend upload failed, continuing in simulation mode.", err);
            }
        }

        // Frontend Simulation (Realistic asynchronous progress)
        return new Promise((resolve) => {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 20;
                if (onProgress) onProgress(Math.min(progress, 100));

                if (progress >= 100) {
                    clearInterval(interval);
                    resolve({
                        success: true,
                        isDemo: true,
                        message: "File loaded into local session memory. (Backend integration ready)",
                        filename: file.name,
                        size: file.size,
                        estimatedRows: 2450,
                        columns: ["Date", "City", "Monitoring_Location", "PM2.5", "PM10", "NO2", "SO2", "O3"]
                    });
                }
            }, 120);
        });
    },

    /**
     * Retrieve summary metadata about the loaded dataset
     */
    async getDatasetInfo() {
        if (API_CONFIG.IS_BACKEND_AVAILABLE) {
            try {
                const res = await fetch(`${API_CONFIG.BASE_URL}/dataset/info`);
                if (res.ok) return await res.json();
            } catch (e) {
                console.warn("Backend call failed, using mock data.", e);
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
                const res = await fetch(`${API_CONFIG.BASE_URL}/dataset/preview?${query}`);
                if (res.ok) return await res.json();
            } catch (e) {
                console.warn("Backend call failed, using mock data.", e);
            }
        }

        // Mock pagination and filtering engine
        let records = [...DEMO_METRIC_RECORDS];

        // Search filter
        if (params.search) {
            const s = params.search.toLowerCase();
            records = records.filter(r =>
                r.city.toLowerCase().includes(s) ||
                r.location.toLowerCase().includes(s) ||
                r.date.includes(s) ||
                r.status.toLowerCase().includes(s)
            );
        }

        // City filter
        if (params.city && params.city !== 'All') {
            records = records.filter(r => r.city === params.city);
        }

        // Location filter
        if (params.location && params.location !== 'All') {
            records = records.filter(r => r.location === params.location);
        }

        // Column sorting
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
                const res = await fetch(`${API_CONFIG.BASE_URL}/data-quality`);
                if (res.ok) return await res.json();
            } catch (e) {
                console.warn("Backend call failed, using mock data.", e);
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
     * Fetch descriptive pollution analysis metrics based on selected filters
     * @param {Object} filters { startDate, endDate, city, location, pollutant }
     */
    async getPollutionAnalysis(filters = {}) {
        if (API_CONFIG.IS_BACKEND_AVAILABLE) {
            try {
                const query = new URLSearchParams(filters).toString();
                const res = await fetch(`${API_CONFIG.BASE_URL}/analysis/pollution?${query}`);
                if (res.ok) return await res.json();
            } catch (e) {
                console.warn("Backend call failed, using mock data.", e);
            }
        }

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
                average: 0,
                max: 0,
                maxLocation: "N/A",
                maxDate: "N/A",
                min: 0,
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

        // Group by station
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
                const res = await fetch(`${API_CONFIG.BASE_URL}/charts/data?type=${chartType}`);
                if (res.ok) return await res.json();
            } catch (e) {
                console.warn("Backend call failed, using mock data.", e);
            }
        }

        // Mock Chart data matching environmental science parameters
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
                        "12 - 35.4 (Moderate)",
                        "35.5 - 55.4 (Unhealthy Sens.)",
                        "55.5 - 150.4 (Unhealthy)",
                        "150.5+ (Very Unhealthy)"
                    ],
                    datasets: [{
                        label: "Observation Frequency Count",
                        data: [412, 1180, 560, 275, 23],
                        backgroundColor: [
                            "#10b981", // Green - Good
                            "#facc15", // Yellow - Moderate
                            "#f97316", // Orange - Sensitive
                            "#ef4444", // Red - Unhealthy
                            "#7c3aed"  // Purple - Very Unhealthy
                        ]
                    }]
                };

            case 'scatter':
                // Realistic positive correlation between PM2.5 and PM10
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
     * In Part 1: Generates a CSV file from demo data locally.
     * In Part 2: Downloads from Flask streaming endpoint.
     */
    async downloadCleanedCSV() {
        if (API_CONFIG.IS_BACKEND_AVAILABLE) {
            window.location.href = `${API_CONFIG.BASE_URL}/export/csv`;
            return { success: true, method: "flask_direct" };
        }

        // Client-side CSV generation
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
        if (API_CONFIG.IS_BACKEND_AVAILABLE) {
            window.location.href = `${API_CONFIG.BASE_URL}/export/report?format=${format}`;
            return { success: true };
        }

        // Print dialog for high quality instant PDF generation
        window.print();
        return { success: true, isDemo: true, message: "Browser print/export preview opened." };
    }
};

// Export to window for global access across app modules
window.ApiService = ApiService;
window.API_CONFIG = API_CONFIG;

