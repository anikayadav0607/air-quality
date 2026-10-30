/**
 * Air Quality and Pollution Pattern Analysis (DA-013)
 * Main Application Controller (app.js)
 * 
 * Handles:
 * - Single-page tab routing and sidebar navigation
 * - Theme switcher (Dark / Light) with persistence
 * - Drag-and-drop CSV dataset upload simulation
 * - Data preview table with search, sorting, and pagination
 * - Data cleaning audit and demonstrative cleaning workflows
 * - Interactive pollution analysis filtering and statistics calculation
 * - Dynamic chart interactions and export triggers
 * - Backend connectivity monitor
 */

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

const App = {
    // Current application state
    state: {
        activeRoute: 'dashboard',
        isDarkMode: false,
        uploadedFile: null,
        previewParams: {
            page: 1,
            limit: 10,
            search: '',
            city: 'All',
            location: 'All',
            sortColumn: 'id',
            sortDir: 'asc'
        },
        previewIsSimulatingEmpty: false,
        previewIsSimulatingLoading: false,
        analysisFilters: {
            startDate: '',
            endDate: '',
            city: 'All',
            location: 'All',
            pollutant: 'pm25'
        }
    },

    /**
     * Entry Point
     */
    async init() {
        this.initTheme();
        this.initRouting();
        this.initSidebar();
        this.initBackendMonitor();
        this.initUploadHandlers();
        this.initPreviewTable();
        this.initCleaningHandlers();
        this.initAnalysisHandlers();
        this.initChartsControls();
        this.initReportsHandlers();

        // Load initial dashboard metrics & charts
        await this.loadDashboardMetrics();
        await window.ChartsManager.initAllCharts();

        console.log("Air Quality Analytics DA-013 initialized successfully.");
    },

    // =========================================================================
    // THEME MANAGEMENT
    // =========================================================================
    initTheme() {
        const savedTheme = localStorage.getItem('da013_theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            this.setTheme(true);
        } else {
            this.setTheme(false);
        }

        const themeToggleBtn = document.getElementById('themeToggleBtn');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                this.setTheme(!this.state.isDarkMode);
            });
        }
    },

    setTheme(isDark) {
        this.state.isDarkMode = isDark;
        const icon = document.querySelector('#themeToggleBtn i');
        const label = document.querySelector('#themeToggleBtn .theme-label');

        if (isDark) {
            document.body.classList.add('dark-theme');
            localStorage.setItem('da013_theme', 'dark');
            if (icon) icon.className = 'fa-solid fa-sun text-warning';
            if (label) label.textContent = 'Light Mode';
        } else {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('da013_theme', 'light');
            if (icon) icon.className = 'fa-solid fa-moon text-primary';
            if (label) label.textContent = 'Dark Mode';
        }

        // Refresh Chart.js palette
        if (window.ChartsManager) {
            window.ChartsManager.refreshTheme();
        }
    },

    // =========================================================================
    // ROUTING & SIDEBAR
    // =========================================================================
    initRouting() {
        const handleHash = () => {
            const hash = window.location.hash.replace('#', '') || 'dashboard';
            this.navigateTo(hash);
        };

        window.addEventListener('hashchange', handleHash);
        handleHash();
    },

    navigateTo(routeId) {
        const views = document.querySelectorAll('.app-view');
        const navLinks = document.querySelectorAll('.nav-link-item');
        let matched = false;

        views.forEach(v => {
            if (v.id === `view-${routeId}`) {
                v.classList.remove('d-none');
                matched = true;
            } else {
                v.classList.add('d-none');
            }
        });

        if (!matched && views.length > 0) {
            // Default to dashboard
            routeId = 'dashboard';
            document.getElementById('view-dashboard')?.classList.remove('d-none');
        }

        this.state.activeRoute = routeId;

        navLinks.forEach(link => {
            const href = link.getAttribute('href') || '';
            if (href === `#${routeId}`) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Update header breadcrumb title
        const titles = {
            'dashboard': 'Dashboard Overview',
            'upload': 'Dataset Upload',
            'preview': 'Data Preview & Exploration',
            'cleaning': 'Data Cleaning & Quality Audit',
            'analysis': 'Pollution Pattern Analysis',
            'charts': 'Charts & Visualizations',
            'reports': 'Summary Reports & Findings',
            'about': 'About Project DA-013'
        };
        const titleElem = document.getElementById('currentViewTitle');
        if (titleElem) titleElem.textContent = titles[routeId] || 'Environmental Analytics';

        // Scroll to top of view
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Lazy chart resize on route change
        if (routeId === 'charts' || routeId === 'dashboard') {
            setTimeout(() => {
                window.ChartsManager.refreshTheme();
            }, 50);
        }
    },

    initSidebar() {
        const sidebar = document.getElementById('appSidebar');
        const toggleBtn = document.getElementById('sidebarToggleBtn');
        const overlay = document.getElementById('sidebarOverlay');

        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', () => {
                // Desktop toggle collapsed, Mobile toggle show
                if (window.innerWidth >= 992) {
                    sidebar.classList.toggle('collapsed');
                    document.getElementById('mainContentWrapper')?.classList.toggle('expanded');
                } else {
                    sidebar.classList.toggle('mobile-open');
                    overlay?.classList.toggle('active');
                }
            });
        }

        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar?.classList.remove('mobile-open');
                overlay.classList.remove('active');
            });
        }

        // Close mobile drawer on route link click
        document.querySelectorAll('.nav-link-item').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 992) {
                    sidebar?.classList.remove('mobile-open');
                    overlay?.classList.remove('active');
                }
            });
        });
    },

    // =========================================================================
    // BACKEND CONNECTIVITY MONITOR
    // =========================================================================
    async initBackendMonitor() {
        const badge = document.getElementById('backendStatusBadge');
        const badgeText = document.getElementById('backendStatusText');
        const pingBtn = document.getElementById('btnPingBackend');

        const updateStatus = async () => {
            const result = await window.ApiService.checkBackendHealth();
            if (result.connected) {
                badge.className = 'badge bg-success-subtle text-success border border-success-subtle px-3 py-2 cursor-pointer';
                badgeText.innerHTML = '<i class="fa-solid fa-circle-check text-success me-1"></i> Flask Backend Live (Port 5000)';
            } else {
                badge.className = 'badge bg-warning-subtle text-dark border border-warning-subtle px-3 py-2 cursor-pointer';
                badgeText.innerHTML = '<i class="fa-solid fa-circle-pause text-warning me-1"></i> Demo Mode (Flask Disconnected)';
            }
        };

        await updateStatus();

        if (badge) {
            badge.addEventListener('click', () => {
                const modal = new bootstrap.Modal(document.getElementById('backendInfoModal'));
                modal.show();
            });
        }

        if (pingBtn) {
            pingBtn.addEventListener('click', async () => {
                pingBtn.disabled = true;
                pingBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Testing...';
                await updateStatus();
                pingBtn.disabled = false;
                pingBtn.innerHTML = '<i class="fa-solid fa-rotate me-1"></i> Retest Connection';
            });
        }
    },

    // =========================================================================
    // DASHBOARD OVERVIEW
    // =========================================================================
    async loadDashboardMetrics() {
        try {
            const info = await window.ApiService.getDatasetInfo();
            document.getElementById('metricTotalRecords').textContent = info.totalRecords.toLocaleString();
            document.getElementById('metricLocations').textContent = `${info.locationsCount} Stations`;
            document.getElementById('metricPollutants').textContent = `${info.pollutantsAvailable.length} Monitored`;
            document.getElementById('metricDateRange').textContent = `${info.dateRange.start} ~ ${info.dateRange.end}`;
        } catch (e) {
            console.error("Failed to load dashboard metrics", e);
        }
    },

    // =========================================================================
    // DATASET UPLOAD
    // =========================================================================
    initUploadHandlers() {
        const dropZone = document.getElementById('csvDropZone');
        const fileInput = document.getElementById('csvFileInput');
        const browseBtn = document.getElementById('btnBrowseFile');
        const uploadBtn = document.getElementById('btnUploadConfirm');
        const removeBtn = document.getElementById('btnRemoveFile');
        const loadSampleBtn = document.getElementById('btnLoadSamplePreset');

        if (!dropZone || !fileInput) return;

        // Open file picker
        browseBtn?.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            fileInput.click();
        });

        // Drag & Drop visual feedback
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-active');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-active');
            }, false);
        });

        // Drop event
        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelected(files[0]);
            }
        });

        // Input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelected(e.target.files[0]);
            }
        });

        // Remove selected file
        removeBtn?.addEventListener('click', () => {
            this.state.uploadedFile = null;
            fileInput.value = '';
            document.getElementById('selectedFileCard').classList.add('d-none');
            document.getElementById('uploadProgressContainer').classList.add('d-none');
            document.getElementById('uploadResultAlert').classList.add('d-none');
            dropZone.classList.remove('d-none');
        });

        // 1-Click Load Sample Dataset
        loadSampleBtn?.addEventListener('click', () => {
            const mockFile = new File(["dummy,csv,content"], "sample_air_quality_data.csv", { type: "text/csv" });
            this.handleFileSelected(mockFile, 142380);
        });

        // Confirm Upload
        uploadBtn?.addEventListener('click', async () => {
            if (!this.state.uploadedFile) return;

            uploadBtn.disabled = true;
            removeBtn.disabled = true;
            const progressContainer = document.getElementById('uploadProgressContainer');
            const progressBar = document.getElementById('uploadProgressBar');
            const progressText = document.getElementById('uploadProgressText');
            const alertBox = document.getElementById('uploadResultAlert');

            progressContainer.classList.remove('d-none');
            alertBox.classList.add('d-none');

            try {
                const res = await window.ApiService.uploadCSV(this.state.uploadedFile, (pct) => {
                    progressBar.style.width = `${pct}%`;
                    progressBar.setAttribute('aria-valuenow', pct);
                    progressText.textContent = `Processing file: ${pct}%`;
                });

                alertBox.className = 'alert alert-success d-flex align-items-center mt-3 shadow-sm';
                alertBox.innerHTML = `
                    <i class="fa-solid fa-circle-check fs-4 me-3 text-success"></i>
                    <div>
                        <strong class="d-block">Upload Complete (Frontend Preview Mode)</strong>
                        <span>"${res.filename}" is loaded into local memory. In Part 2, real pandas validation will execute on the Flask backend.</span>
                    </div>
                `;
                alertBox.classList.remove('d-none');

                this.showToast('Dataset loaded successfully in simulation mode.', 'success');
            } catch (err) {
                alertBox.className = 'alert alert-danger d-flex align-items-center mt-3 shadow-sm';
                alertBox.innerHTML = `
                    <i class="fa-solid fa-circle-exclamation fs-4 me-3 text-danger"></i>
                    <div>
                        <strong class="d-block">Upload Error</strong>
                        <span>${err.message}</span>
                    </div>
                `;
                alertBox.classList.remove('d-none');
            } finally {
                uploadBtn.disabled = false;
                removeBtn.disabled = false;
            }
        });
    },

    handleFileSelected(file, customSize = null) {
        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showToast('Unsupported file format. Please upload a .csv file.', 'danger');
            return;
        }

        this.state.uploadedFile = file;
        const fileCard = document.getElementById('selectedFileCard');
        const dropZone = document.getElementById('csvDropZone');
        const nameDisplay = document.getElementById('selectedFileName');
        const sizeDisplay = document.getElementById('selectedFileSize');

        const fileSize = customSize || file.size;
        const formattedSize = (fileSize / 1024).toFixed(1) + ' KB';

        nameDisplay.textContent = file.name;
        sizeDisplay.textContent = formattedSize;

        dropZone.classList.add('d-none');
        fileCard.classList.remove('d-none');
        document.getElementById('uploadProgressContainer').classList.add('d-none');
        document.getElementById('uploadResultAlert').classList.add('d-none');
    },

    // =========================================================================
    // DATA PREVIEW & EXPLORATION
    // =========================================================================
    initPreviewTable() {
        const searchInput = document.getElementById('tableSearchInput');
        const cityFilter = document.getElementById('previewCityFilter');
        const locationFilter = document.getElementById('previewLocationFilter');
        const limitSelect = document.getElementById('previewLimitSelect');
        const simulateEmptyBtn = document.getElementById('btnSimulateEmpty');
        const simulateLoadingBtn = document.getElementById('btnSimulateLoading');

        // Search listener
        searchInput?.addEventListener('input', (e) => {
            this.state.previewParams.search = e.target.value;
            this.state.previewParams.page = 1;
            this.renderPreviewTable();
        });

        // City filter
        cityFilter?.addEventListener('change', (e) => {
            this.state.previewParams.city = e.target.value;
            this.state.previewParams.page = 1;
            this.renderPreviewTable();
        });

        // Location filter
        locationFilter?.addEventListener('change', (e) => {
            this.state.previewParams.location = e.target.value;
            this.state.previewParams.page = 1;
            this.renderPreviewTable();
        });

        // Rows per page
        limitSelect?.addEventListener('change', (e) => {
            this.state.previewParams.limit = parseInt(e.target.value, 10);
            this.state.previewParams.page = 1;
            this.renderPreviewTable();
        });

        // Sortable headers
        document.querySelectorAll('#previewTable th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.getAttribute('data-sort');
                if (this.state.previewParams.sortColumn === col) {
                    this.state.previewParams.sortDir = this.state.previewParams.sortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    this.state.previewParams.sortColumn = col;
                    this.state.previewParams.sortDir = 'asc';
                }
                this.updateSortIcons();
                this.renderPreviewTable();
            });
        });

        // Simulation toggles for developer / reviewer inspection
        simulateEmptyBtn?.addEventListener('click', () => {
            this.state.previewIsSimulatingEmpty = !this.state.previewIsSimulatingEmpty;
            simulateEmptyBtn.classList.toggle('active', this.state.previewIsSimulatingEmpty);
            this.renderPreviewTable();
        });

        simulateLoadingBtn?.addEventListener('click', () => {
            this.state.previewIsSimulatingLoading = true;
            this.renderPreviewTable();
            setTimeout(() => {
                this.state.previewIsSimulatingLoading = false;
                this.renderPreviewTable();
            }, 1200);
        });

        this.renderPreviewTable();
    },

    updateSortIcons() {
        document.querySelectorAll('#previewTable th[data-sort]').forEach(th => {
            const col = th.getAttribute('data-sort');
            const icon = th.querySelector('.sort-icon');
            if (!icon) return;

            if (this.state.previewParams.sortColumn === col) {
                icon.className = this.state.previewParams.sortDir === 'asc' 
                    ? 'fa-solid fa-sort-up sort-icon text-primary' 
                    : 'fa-solid fa-sort-down sort-icon text-primary';
            } else {
                icon.className = 'fa-solid fa-sort sort-icon text-muted opacity-50';
            }
        });
    },

    async renderPreviewTable() {
        const tbody = document.getElementById('previewTableBody');
        const emptyState = document.getElementById('previewEmptyState');
        const loadingState = document.getElementById('previewLoadingState');
        const paginationContainer = document.getElementById('previewPagination');
        const paginationInfo = document.getElementById('previewPaginationInfo');

        if (!tbody) return;

        // Check simulated loading
        if (this.state.previewIsSimulatingLoading) {
            tbody.innerHTML = '';
            loadingState?.classList.remove('d-none');
            emptyState?.classList.add('d-none');
            return;
        } else {
            loadingState?.classList.add('d-none');
        }

        // Check simulated empty
        if (this.state.previewIsSimulatingEmpty) {
            tbody.innerHTML = '';
            emptyState?.classList.remove('d-none');
            if (paginationInfo) paginationInfo.textContent = 'Showing 0 to 0 of 0 entries';
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        const res = await window.ApiService.getCleanedRecords(this.state.previewParams);

        if (!res.data || res.data.length === 0) {
            tbody.innerHTML = '';
            emptyState?.classList.remove('d-none');
            if (paginationInfo) paginationInfo.textContent = 'Showing 0 to 0 of 0 entries';
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        emptyState?.classList.add('d-none');

        // Render rows
        tbody.innerHTML = res.data.map(row => {
            const aqiBadge = this.getAqiBadge(row.aqi, row.status);
            return `
                <tr>
                    <td class="fw-semibold text-secondary">${row.date}</td>
                    <td><span class="badge bg-light text-dark border">${row.city}</span></td>
                    <td class="fw-medium">${row.location}</td>
                    <td><span class="fw-bold ${row.pm25 > 55 ? 'text-danger' : (row.pm25 > 35 ? 'text-warning' : 'text-success')}">${row.pm25.toFixed(1)}</span></td>
                    <td>${row.pm10.toFixed(1)}</td>
                    <td>${row.no2.toFixed(1)}</td>
                    <td>${row.so2.toFixed(1)}</td>
                    <td>${row.o3.toFixed(1)}</td>
                    <td>${aqiBadge}</td>
                </tr>
            `;
        }).join('');

        // Pagination Info
        const start = ((res.page - 1) * res.limit) + 1;
        const end = Math.min(res.page * res.limit, res.total);
        if (paginationInfo) {
            paginationInfo.textContent = `Showing ${start} to ${end} of ${res.total} sample records`;
        }

        // Render Pagination Controls
        this.renderPaginationButtons(res.page, res.totalPages);
    },

    getAqiBadge(aqi, status) {
        if (aqi <= 50) return `<span class="badge bg-success text-white"><i class="fa-solid fa-leaf me-1"></i> Good (${aqi})</span>`;
        if (aqi <= 100) return `<span class="badge bg-warning text-dark"><i class="fa-solid fa-triangle-exclamation me-1"></i> Moderate (${aqi})</span>`;
        if (aqi <= 150) return `<span class="badge bg-orange text-white" style="background-color: #f97316;">Sensitive (${aqi})</span>`;
        if (aqi <= 200) return `<span class="badge bg-danger text-white"><i class="fa-solid fa-circle-exclamation me-1"></i> Unhealthy (${aqi})</span>`;
        return `<span class="badge bg-purple text-white" style="background-color: #7c3aed;">Hazardous (${aqi})</span>`;
    },

    renderPaginationButtons(currentPage, totalPages) {
        const container = document.getElementById('previewPagination');
        if (!container) return;

        let html = '';

        // Previous button
        html += `
            <li class="page-item ${currentPage <= 1 ? 'disabled' : ''}">
                <button class="page-link" aria-label="Previous" onclick="App.setPreviewPage(${currentPage - 1})">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
            </li>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                html += `
                    <li class="page-item ${i === currentPage ? 'active' : ''}">
                        <button class="page-link" onclick="App.setPreviewPage(${i})">${i}</button>
                    </li>
                `;
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        // Next button
        html += `
            <li class="page-item ${currentPage >= totalPages ? 'disabled' : ''}">
                <button class="page-link" aria-label="Next" onclick="App.setPreviewPage(${currentPage + 1})">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </li>
        `;

        container.innerHTML = html;
    },

    setPreviewPage(newPage) {
        this.state.previewParams.page = newPage;
        this.renderPreviewTable();
    },

    // =========================================================================
    // DATA CLEANING WORKFLOW
    // =========================================================================
    initCleaningHandlers() {
        const checkQualityBtn = document.getElementById('btnCheckDataQuality');
        const cleanDatasetBtn = document.getElementById('btnCleanDataset');
        const downloadCleanedBtn = document.getElementById('btnDownloadCleanedCsv');

        checkQualityBtn?.addEventListener('click', async () => {
            checkQualityBtn.disabled = true;
            checkQualityBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Auditing Sensor Records...';

            await new Promise(r => setTimeout(r, 800)); // Smooth UX pause
            const stats = await window.ApiService.getDataQualityStats();

            document.getElementById('cleanAuditMissing').textContent = stats.metrics.missingValues;
            document.getElementById('cleanAuditDuplicates').textContent = stats.metrics.duplicateRecords;
            document.getElementById('cleanAuditInvalidNumeric').textContent = stats.metrics.invalidNumeric;
            document.getElementById('cleanAuditInvalidDates').textContent = stats.metrics.invalidDates;
            document.getElementById('cleanHealthScore').textContent = `${stats.metrics.healthScore}%`;

            checkQualityBtn.disabled = false;
            checkQualityBtn.innerHTML = '<i class="fa-solid fa-shield-halved me-2"></i>Check Data Quality';

            this.showToast('Data quality audit scan complete. 103 items flagged for cleaning.', 'info');
        });

        cleanDatasetBtn?.addEventListener('click', async () => {
            cleanDatasetBtn.disabled = true;
            cleanDatasetBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Executing Cleaning Pipeline...';

            await new Promise(r => setTimeout(r, 1000));

            // Visual simulation of cleaned status
            document.getElementById('cleaningResultBanner').classList.remove('d-none');
            document.getElementById('cleanAuditMissing').textContent = '0 (Imputed)';
            document.getElementById('cleanAuditDuplicates').textContent = '0 (Removed)';
            document.getElementById('cleanAuditInvalidNumeric').textContent = '0 (Corrected)';
            document.getElementById('cleanHealthScore').textContent = '99.8%';

            cleanDatasetBtn.disabled = false;
            cleanDatasetBtn.innerHTML = '<i class="fa-solid fa-check-double me-2"></i>Dataset Cleaned (Demonstration)';

            this.showToast('Demonstration: Missing values imputed with median, duplicates purged.', 'success');
        });

        downloadCleanedBtn?.addEventListener('click', async () => {
            await window.ApiService.downloadCleanedCSV();
            this.showToast('Downloading cleaned dataset CSV...', 'success');
        });
    },

    // =========================================================================
    // POLLUTION ANALYSIS
    // =========================================================================
    initAnalysisHandlers() {
        const applyBtn = document.getElementById('btnApplyAnalysisFilters');
        const resetBtn = document.getElementById('btnResetAnalysisFilters');

        applyBtn?.addEventListener('click', () => {
            this.state.analysisFilters.startDate = document.getElementById('filterStartDate').value;
            this.state.analysisFilters.endDate = document.getElementById('filterEndDate').value;
            this.state.analysisFilters.city = document.getElementById('filterCity').value;
            this.state.analysisFilters.location = document.getElementById('filterLocation').value;
            this.state.analysisFilters.pollutant = document.getElementById('filterPollutant').value;

            this.updateAnalysisMetrics();
            this.showToast('Pollution analysis filters applied.', 'info');
        });

        resetBtn?.addEventListener('click', () => {
            document.getElementById('filterStartDate').value = '';
            document.getElementById('filterEndDate').value = '';
            document.getElementById('filterCity').value = 'All';
            document.getElementById('filterLocation').value = 'All';
            document.getElementById('filterPollutant').value = 'pm25';

            this.state.analysisFilters = {
                startDate: '',
                endDate: '',
                city: 'All',
                location: 'All',
                pollutant: 'pm25'
            };

            this.updateAnalysisMetrics();
            this.showToast('Filters reset to default.', 'secondary');
        });

        this.updateAnalysisMetrics();
    },

    async updateAnalysisMetrics() {
        const stats = await window.ApiService.getPollutionAnalysis(this.state.analysisFilters);

        document.getElementById('analysisAvgVal').textContent = `${stats.average} ${stats.unit}`;
        document.getElementById('analysisMaxVal').textContent = `${stats.max} ${stats.unit}`;
        document.getElementById('analysisMaxMeta').textContent = `${stats.maxLocation} on ${stats.maxDate}`;
        document.getElementById('analysisMinVal').textContent = `${stats.min} ${stats.unit}`;
        document.getElementById('analysisMinMeta').textContent = `${stats.minLocation} on ${stats.minDate}`;
        document.getElementById('analysisCountVal').textContent = `${stats.count} readings`;

        // Render station breakdown table
        const tbody = document.getElementById('analysisStationTableBody');
        if (tbody) {
            tbody.innerHTML = stats.stationAverages.map(s => `
                <tr>
                    <td class="fw-medium">${s.location}</td>
                    <td><span class="badge bg-light text-secondary border">${s.city}</span></td>
                    <td class="fw-bold text-primary">${s.average} ${stats.unit}</td>
                    <td class="text-muted">${s.samples} samples</td>
                    <td>
                        <div class="progress" style="height: 6px;">
                            <div class="progress-bar ${s.average > 60 ? 'bg-danger' : (s.average > 35 ? 'bg-warning' : 'bg-success')}" 
                                 role="progressbar" style="width: ${Math.min((s.average / 150) * 100, 100)}%">
                            </div>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    },

    // =========================================================================
    // CHARTS CONTROLS
    // =========================================================================
    initChartsControls() {
        const pollutantSelect = document.getElementById('lineChartPollutantSelect');
        pollutantSelect?.addEventListener('change', (e) => {
            window.ChartsManager.renderLineChart(e.target.value);
        });

        // Chart download buttons
        document.querySelectorAll('.btn-download-chart').forEach(btn => {
            btn.addEventListener('click', () => {
                const chartKey = btn.getAttribute('data-chart');
                window.ChartsManager.downloadChart(chartKey, `air_quality_${chartKey}_chart`);
                this.showToast(`Exported ${chartKey} chart image.`, 'info');
            });
        });
    },

    // =========================================================================
    // REPORTS & EXPORT
    // =========================================================================
    initReportsHandlers() {
        const exportReportBtn = document.getElementById('btnExportReport');
        const downloadCleanedBtn = document.getElementById('btnReportDownloadCleaned');

        exportReportBtn?.addEventListener('click', async () => {
            await window.ApiService.exportReport('pdf');
        });

        downloadCleanedBtn?.addEventListener('click', async () => {
            await window.ApiService.downloadCleanedCSV();
            this.showToast('Cleaned CSV downloaded.', 'success');
        });
    },

    // =========================================================================
    // UI TOAST HELPER
    // =========================================================================
    showToast(message, variant = 'primary') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const id = 'toast_' + Date.now();
        const toastHtml = `
            <div id="${id}" class="toast align-items-center text-bg-${variant} border-0 shadow" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fa-solid fa-circle-info me-2"></i> ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', toastHtml);
        const toastElem = document.getElementById(id);
        const toast = new bootstrap.Toast(toastElem, { delay: 3500 });
        toast.show();

        toastElem.addEventListener('hidden.bs.toast', () => {
            toastElem.remove();
        });
    }
};

window.App = App;

