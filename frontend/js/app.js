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

                // Mark badges as Live Backend Data
                document.querySelectorAll('.demo-pill').forEach(pill => {
                    pill.innerHTML = '<i class="fa-solid fa-server me-1"></i> FLASK LIVE DATA';
                    pill.className = 'badge bg-success-subtle text-success border border-success-subtle py-1 px-2';
                });

                // Refresh dashboard components with live data
                await this.loadDashboardMetrics();
                await this.renderPreviewTable();
                await this.updateAnalysisMetrics();
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

const EMBEDDED_SAMPLE_CSV = `Date,City,Monitoring_Location,PM2.5,PM10,NO2,SO2,O3
2024-01-01,Metropolis,Downtown Central,42.5,68.2,34.1,8.4,22.0
2024-01-01,Metropolis,Industrial Zone North,78.3,135.0,52.4,18.7,15.2
2024-01-01,Metropolis,Suburbia East,18.2,32.4,14.6,3.1,38.5
2024-01-01,Harbor City,Harbor Portside,55.0,92.6,41.2,12.5,28.4
2024-01-01,Green Valley,Valley Park Eco-Reserve,11.4,21.0,8.2,1.8,44.1
2024-01-02,Metropolis,Downtown Central,45.1,72.4,36.5,9.1,20.5
2024-01-02,Metropolis,Industrial Zone North,84.6,142.8,56.0,21.3,14.0
2024-01-02,Metropolis,Suburbia East,19.5,34.0,15.2,3.4,36.8
2024-01-02,Harbor City,Harbor Portside,58.3,96.0,43.8,13.2,27.1
2024-01-02,Green Valley,Valley Park Eco-Reserve,12.0,22.5,8.9,1.9,42.6
2024-01-03,Metropolis,Downtown Central,51.8,81.2,39.0,10.5,19.2
2024-01-03,Metropolis,Industrial Zone North,92.1,155.4,61.2,24.0,12.8
2024-01-03,Metropolis,Suburbia East,22.4,38.7,16.8,3.9,34.2
2024-01-03,Harbor City,Harbor Portside,63.7,104.2,46.5,14.8,25.0
2024-01-03,Green Valley,Valley Park Eco-Reserve,13.5,24.1,9.4,2.1,41.0
2024-01-04,Metropolis,Downtown Central,38.2,61.0,30.4,7.8,25.4
2024-01-04,Metropolis,Industrial Zone North,71.0,122.5,48.0,16.2,18.0
2024-01-04,Metropolis,Suburbia East,16.0,29.1,13.2,2.8,40.1
2024-01-04,Harbor City,Harbor Portside,49.2,83.0,37.1,11.0,31.5
2024-01-04,Green Valley,Valley Park Eco-Reserve,9.8,18.4,7.5,1.5,46.8
2024-01-05,Metropolis,Downtown Central,35.0,56.8,28.0,6.9,28.0
2024-01-05,Metropolis,Industrial Zone North,65.4,115.0,44.2,15.0,19.5
2024-01-05,Metropolis,Suburbia East,14.8,27.0,12.0,2.5,42.0
2024-01-05,Harbor City,Harbor Portside,44.0,76.5,34.0,9.8,33.0
2024-01-05,Green Valley,Valley Park Eco-Reserve,8.5,16.2,6.8,1.2,48.5
2024-02-10,Metropolis,Downtown Central,58.4,94.1,45.2,12.8,18.4
2024-02-10,Metropolis,Industrial Zone North,108.2,186.4,68.9,29.4,11.2
2024-02-10,Metropolis,Suburbia East,25.6,44.2,18.4,4.2,32.0
2024-02-10,Harbor City,Harbor Portside,72.1,120.5,51.0,17.5,22.6
2024-02-10,Green Valley,Valley Park Eco-Reserve,14.2,26.0,10.1,2.3,39.4
2024-02-11,Metropolis,Downtown Central,62.0,99.8,48.0,14.0,16.5
2024-02-11,Metropolis,Industrial Zone North,115.0,198.0,72.4,32.1,9.8
2024-02-11,Metropolis,Suburbia East,28.1,48.0,19.8,4.8,30.1
2024-02-11,Harbor City,Harbor Portside,78.4,129.0,54.6,19.2,20.4
2024-02-11,Green Valley,Valley Park Eco-Reserve,15.8,28.4,11.0,2.6,37.8
2024-03-15,Metropolis,Downtown Central,32.6,54.1,26.8,5.9,35.2
2024-03-15,Metropolis,Industrial Zone North,60.2,108.4,41.5,13.8,26.4
2024-03-15,Metropolis,Suburbia East,15.1,28.0,11.4,2.2,46.0
2024-03-15,Harbor City,Harbor Portside,41.5,72.0,32.0,8.6,38.0
2024-03-15,Green Valley,Valley Park Eco-Reserve,9.1,17.5,6.2,1.3,52.1
2024-04-20,Metropolis,Downtown Central,28.4,49.2,24.0,5.1,42.8
2024-04-20,Metropolis,Industrial Zone North,54.8,98.6,38.2,11.9,32.0
2024-04-20,Metropolis,Suburbia East,13.6,25.4,10.2,2.0,51.2
2024-04-20,Harbor City,Harbor Portside,37.0,66.8,29.5,7.9,45.4
2024-04-20,Green Valley,Valley Park Eco-Reserve,8.0,15.0,5.8,1.1,58.0
2024-05-25,Metropolis,Downtown Central,36.2,59.8,29.1,6.5,48.6
2024-05-25,Metropolis,Industrial Zone North,68.4,119.2,46.0,15.4,36.2
2024-05-25,Metropolis,Suburbia East,16.8,30.5,12.8,2.7,56.4
2024-05-25,Harbor City,Harbor Portside,46.2,80.4,35.8,9.5,49.0
2024-05-25,Green Valley,Valley Park Eco-Reserve,10.2,19.1,7.0,1.4,63.5
2024-06-18,Metropolis,Downtown Central,48.5,79.0,38.6,9.2,58.4
2024-06-18,Metropolis,Industrial Zone North,88.0,150.2,58.4,20.5,44.0
2024-06-18,Metropolis,Suburbia East,21.0,37.8,15.9,3.6,67.2
2024-06-18,Harbor City,Harbor Portside,59.4,101.5,44.0,13.0,55.8
2024-06-18,Green Valley,Valley Park Eco-Reserve,12.6,23.4,8.5,1.7,74.2
2024-07-22,Metropolis,Downtown Central,52.1,84.5,41.0,10.1,62.0
2024-07-22,Metropolis,Industrial Zone North,95.4,162.8,63.0,22.8,48.5
2024-07-22,Metropolis,Suburbia East,23.5,41.0,17.2,3.9,71.0
2024-07-22,Harbor City,Harbor Portside,65.0,110.0,47.8,14.5,60.2
2024-07-22,Green Valley,Valley Park Eco-Reserve,14.0,25.8,9.1,1.9,79.5
2024-08-14,Metropolis,Downtown Central,44.0,73.0,35.2,8.0,54.1
2024-08-14,Metropolis,Industrial Zone North,81.5,140.0,53.8,18.4,41.0
2024-08-14,Metropolis,Suburbia East,19.2,35.0,14.8,3.2,62.5
2024-08-14,Harbor City,Harbor Portside,53.8,92.4,39.6,11.8,51.0
2024-08-14,Green Valley,Valley Park Eco-Reserve,11.5,21.2,7.9,1.5,68.4
2024-09-19,Metropolis,Downtown Central,39.8,65.4,31.5,7.2,41.0
2024-09-19,Metropolis,Industrial Zone North,74.2,128.0,49.0,16.5,30.5
2024-09-19,Metropolis,Suburbia East,17.4,31.2,13.5,2.9,49.0
2024-09-19,Harbor City,Harbor Portside,48.5,84.0,36.2,10.2,42.5
2024-09-19,Green Valley,Valley Park Eco-Reserve,10.0,18.8,7.1,1.3,55.0
2024-10-25,Metropolis,Downtown Central,47.5,78.2,38.0,9.5,29.4
2024-10-25,Metropolis,Industrial Zone North,86.4,148.5,57.5,20.0,21.0
2024-10-25,Metropolis,Suburbia East,20.8,37.0,15.5,3.5,41.2
2024-10-25,Harbor City,Harbor Portside,57.2,98.0,42.5,12.8,34.0
2024-10-25,Green Valley,Valley Park Eco-Reserve,12.2,23.0,8.4,1.8,47.0
2024-11-15,Metropolis,Downtown Central,66.8,106.5,51.2,15.4,15.8
2024-11-15,Metropolis,Industrial Zone North,124.5,214.0,76.8,34.2,9.2
2024-11-15,Metropolis,Suburbia East,30.4,52.8,21.5,5.2,27.5
2024-11-15,Harbor City,Harbor Portside,84.0,138.2,58.0,21.0,18.4
2024-11-15,Green Valley,Valley Park Eco-Reserve,17.5,31.0,12.4,2.9,33.0
2024-12-20,Metropolis,Downtown Central,72.4,115.0,55.0,17.0,13.5
2024-12-20,Metropolis,Industrial Zone North,132.0,226.5,81.4,37.8,7.8
2024-12-20,Metropolis,Suburbia East,33.0,57.4,23.6,5.8,24.0
2024-12-20,Harbor City,Harbor Portside,91.2,149.0,62.5,23.5,15.2
2024-12-20,Green Valley,Valley Park Eco-Reserve,19.2,34.0,13.8,3.2,30.1`;

        // 1-Click Load Sample Dataset
        loadSampleBtn?.addEventListener('click', async () => {
            let csvText = EMBEDDED_SAMPLE_CSV;
            try {
                const res = await fetch('assets/sample_air_quality_data.csv');
                if (res.ok) {
                    const fetchedText = await res.text();
                    if (fetchedText && fetchedText.length > 50) {
                        csvText = fetchedText;
                    }
                }
            } catch (e) {
                // Fallback to EMBEDDED_SAMPLE_CSV
            }

            const realFile = new File([csvText], "sample_air_quality_data.csv", { type: "text/csv" });
            this.handleFileSelected(realFile, realFile.size);
            this.showToast('Sample air quality dataset ready. Click "Upload & Analyze" to process with backend.', 'info');
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

                if (!res.isDemo) {
                    alertBox.className = 'alert alert-success d-flex align-items-center mt-3 shadow-sm';
                    alertBox.innerHTML = `
                        <i class="fa-solid fa-circle-check fs-4 me-3 text-success"></i>
                        <div>
                            <strong class="d-block">Upload & Ingestion Complete (Flask Backend Active)</strong>
                            <span>"${res.filename}" processed with Pandas. <strong>${res.totalRecords} records</strong> and <strong>${res.locationsCount} locations</strong> registered on server.</span>
                        </div>
                    `;
                    alertBox.classList.remove('d-none');
                    this.showToast(`"${res.filename}" ingested and active on backend!`, 'success');

                    // Update live badges
                    document.querySelectorAll('.demo-pill').forEach(pill => {
                        pill.innerHTML = `<i class="fa-solid fa-server me-1"></i> LIVE DATA: ${res.filename}`;
                        pill.className = 'badge bg-success-subtle text-success border border-success-subtle py-1 px-2';
                    });

                    // Refresh all views with live backend data
                    await this.loadDashboardMetrics();
                    this.state.previewParams.page = 1;
                    await this.renderPreviewTable();
                    await this.updateAnalysisMetrics();
                    await window.ChartsManager.initAllCharts();
                } else {
                    alertBox.className = 'alert alert-success d-flex align-items-center mt-3 shadow-sm';
                    alertBox.innerHTML = `
                        <i class="fa-solid fa-circle-check fs-4 me-3 text-success"></i>
                        <div>
                            <strong class="d-block">Upload Complete (Frontend Preview Mode)</strong>
                            <span>"${res.filename}" is loaded into local memory. Start Flask backend for server-side processing.</span>
                        </div>
                    `;
                    alertBox.classList.remove('d-none');
                    this.showToast('Dataset loaded successfully in simulation mode.', 'success');
                }
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
        const scanOutliersBtn = document.getElementById('btnScanMLOutliers');
        const persistBtn = document.getElementById('btnPersistAnalysis');

        // Scikit-learn Anomaly Scan
        scanOutliersBtn?.addEventListener('click', async () => {
            const contamination = parseFloat(document.getElementById('selectContamination')?.value || 0.05);
            scanOutliersBtn.disabled = true;
            scanOutliersBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>Scanning...';

            const res = await window.ApiService.getMLOutliers(contamination);
            const badge = document.getElementById('cleanAuditMLOutliers');
            if (badge) {
                badge.textContent = `${res.outlierCount || 0} (${res.outlierPercentage || 0}%)`;
            }

            scanOutliersBtn.disabled = false;
            scanOutliersBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass-chart me-1"></i>Scan Outliers';
            this.showToast(`Scikit-learn Isolation Forest detected ${res.outlierCount} multivariate anomalies.`, 'info');
        });

        // Persist Analysis Snapshot
        persistBtn?.addEventListener('click', async () => {
            persistBtn.disabled = true;
            persistBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>Saving...';

            const res = await window.ApiService.persistAnalysis("Manual Snapshot by Analyst");
            persistBtn.disabled = false;
            persistBtn.innerHTML = '<i class="fa-solid fa-floppy-disk me-2"></i>Persist Analysis Snapshot';
            this.showToast('Full Scikit-learn statistical analysis persisted to outputs disk storage.', 'success');
        });

        checkQualityBtn?.addEventListener('click', async () => {
            checkQualityBtn.disabled = true;
            checkQualityBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Auditing Sensor Records...';

            await new Promise(r => setTimeout(r, 600)); // Smooth UX pause
            const stats = await window.ApiService.getDataQualityStats();
            const contamination = parseFloat(document.getElementById('selectContamination')?.value || 0.05);
            const mlScan = await window.ApiService.getMLOutliers(contamination);

            document.getElementById('cleanAuditMissing').textContent = stats.metrics.missingValues;
            document.getElementById('cleanAuditDuplicates').textContent = stats.metrics.duplicateRecords;
            document.getElementById('cleanAuditInvalidNumeric').textContent = stats.metrics.invalidNumeric;
            document.getElementById('cleanAuditMLOutliers').textContent = `${mlScan.outlierCount || 0}`;
            document.getElementById('cleanHealthScore').textContent = `${stats.metrics.healthScore}%`;

            checkQualityBtn.disabled = false;
            checkQualityBtn.innerHTML = '<i class="fa-solid fa-shield-halved me-2"></i>Check Data Quality';

            this.showToast(`Audit scan complete. ${mlScan.outlierCount || 0} ML IsolationForest anomalies flagged.`, 'info');
        });

        cleanDatasetBtn?.addEventListener('click', async () => {
            cleanDatasetBtn.disabled = true;
            cleanDatasetBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Executing Cleaning Pipeline...';

            const filterOutliers = document.getElementById('checkFilterOutliers')?.checked ?? true;
            const contamination = parseFloat(document.getElementById('selectContamination')?.value || 0.05);

            const cleanRes = await window.ApiService.cleanDataset({
                impute_method: 'median',
                filter_outliers: filterOutliers,
                contamination: contamination
            });

            // Display results
            const banner = document.getElementById('cleaningResultBanner');
            banner.classList.remove('d-none');
            const summarySpan = banner.querySelector('span');
            if (summarySpan && cleanRes.actions) {
                summarySpan.textContent = cleanRes.actions.join(' ');
            }

            document.getElementById('cleanAuditMissing').textContent = `${cleanRes.metrics.imputedValues || 0} (Imputed)`;
            document.getElementById('cleanAuditDuplicates').textContent = `${cleanRes.metrics.duplicatesRemoved || 0} (Removed)`;
            document.getElementById('cleanAuditInvalidNumeric').textContent = `${cleanRes.metrics.clampedValues || 0} (Corrected)`;
            document.getElementById('cleanAuditMLOutliers').textContent = `${cleanRes.metrics.outliersFiltered || 0} (Filtered)`;
            document.getElementById('cleanHealthScore').textContent = `${cleanRes.metrics.healthScore || 99.8}%`;

            cleanDatasetBtn.disabled = false;
            cleanDatasetBtn.innerHTML = '<i class="fa-solid fa-check-double me-2"></i>Dataset Cleaned & Filtered';

            this.showToast('Cleaning & Scikit-learn outlier filtering executed successfully.', 'success');
            await this.renderPreviewTable();
            await this.updateAnalysisMetrics();
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

        // Render Scikit-learn Machine Learning Intelligence
        await this.renderMLInsights(this.state.analysisFilters.pollutant || 'pm25');
    },

    async renderMLInsights(pollutant = 'pm25') {
        const clusterContainer = document.getElementById('mlClusterContainer');
        const trendContainer = document.getElementById('mlTrendContainer');

        // 1. Scikit-learn KMeans Clusters
        if (clusterContainer) {
            try {
                const clusterRes = await window.ApiService.getMLClusters(3);
                if (clusterRes.stations && clusterRes.stations.length > 0) {
                    clusterContainer.innerHTML = clusterRes.stations.map(st => {
                        let badgeColor = 'bg-success-subtle text-success border-success-subtle';
                        if (st.riskProfile.includes('High') || st.riskProfile.includes('Hotspot')) {
                            badgeColor = 'bg-danger-subtle text-danger border-danger-subtle';
                        } else if (st.riskProfile.includes('Moderate')) {
                            badgeColor = 'bg-warning-subtle text-dark border-warning-subtle';
                        }
                        return `
                            <div class="p-2 border rounded-2 d-flex justify-content-between align-items-center bg-light-subtle">
                                <div>
                                    <span class="fw-semibold small">${st.location}</span>
                                    <div class="text-muted" style="font-size: 0.72rem;">Cluster #${st.clusterId}</div>
                                </div>
                                <span class="badge ${badgeColor} border py-1 px-2">${st.riskProfile}</span>
                            </div>
                        `;
                    }).join('');
                }
            } catch (err) {
                console.warn("Could not render KMeans clusters", err);
            }
        }

        // 2. Scikit-learn Linear Regression Trend Forecast
        if (trendContainer) {
            try {
                const trendRes = await window.ApiService.getMLTrend(pollutant, 5);
                if (trendRes.forecast) {
                    const slopeColor = trendRes.slopePerDay > 0 ? 'text-danger' : 'text-success';
                    const slopeIcon = trendRes.slopePerDay > 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
                    trendContainer.innerHTML = `
                        <div class="p-2 border rounded-2 bg-light-subtle mb-2">
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="small fw-semibold">Slope Velocity:</span>
                                <span class="fw-bold ${slopeColor} small">
                                    <i class="fa-solid ${slopeIcon} me-1"></i>${trendRes.slopePerDay > 0 ? '+' : ''}${trendRes.slopePerDay} unit/day
                                </span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mt-1">
                                <span class="small text-muted">Goodness of Fit (R²):</span>
                                <span class="badge bg-secondary-subtle text-secondary">${trendRes.r2Score}</span>
                            </div>
                            <div class="small text-muted mt-1">Trajectory: <strong>${trendRes.trendDirection}</strong></div>
                        </div>
                        <div class="small fw-bold text-muted mb-1">5-Step Forward Projection:</div>
                        <div class="d-flex gap-2 flex-wrap">
                            ${trendRes.forecast.map(f => `
                                <div class="p-2 border rounded text-center bg-white flex-fill" style="min-width: 60px;">
                                    <div class="text-muted" style="font-size: 0.7rem;">+${f.dayOffset}d</div>
                                    <div class="fw-bold text-primary small">${f.projectedValue}</div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
            } catch (err) {
                console.warn("Could not render trend forecast", err);
            }
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
        const exportTextReportBtn = document.getElementById('btnExportTextReport');
        const downloadCleanedBtn = document.getElementById('btnReportDownloadCleaned');

        exportReportBtn?.addEventListener('click', async () => {
            await window.ApiService.exportReport('pdf');
        });

        exportTextReportBtn?.addEventListener('click', async () => {
            await window.ApiService.exportReport('txt');
            this.showToast('Downloading executive text report from backend...', 'info');
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

