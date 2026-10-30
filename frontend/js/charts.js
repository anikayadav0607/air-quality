/**
 * Air Quality and Pollution Pattern Analysis (DA-013)
 * Chart.js Visualizations Manager (charts.js)
 * 
 * Provides:
 * 1. Line Chart: Pollutant levels over time
 * 2. Bar Chart: Multi-station pollutant comparison
 * 3. Histogram: Distribution frequency across concentration bins
 * 4. Scatter Plot: PM2.5 vs PM10 correlation analysis
 * 
 * Includes:
 * - Light / Dark theme synchronization
 * - High-resolution PNG chart export
 * - Custom responsive tooltips with environmental units
 * - Dynamic pollutant filtering
 */

const ChartsManager = {
    instances: {},

    /**
     * Get theme-specific visual options for Chart.js
     */
    getThemeOptions() {
        const isDark = document.body.classList.contains('dark-theme');
        return {
            textColor: isDark ? '#cbd5e1' : '#475569',
            gridColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            tooltipBg: isDark ? '#1e293b' : '#0f172a',
            tooltipText: '#ffffff'
        };
    },

    /**
     * Initialize all 4 demo charts
     */
    async initAllCharts() {
        await Promise.all([
            this.renderLineChart(),
            this.renderBarChart(),
            this.renderHistogram(),
            this.renderScatterPlot()
        ]);
    },

    /**
     * Re-render or update theme colors across all initialized charts
     */
    refreshTheme() {
        const theme = this.getThemeOptions();

        Object.values(this.instances).forEach(chart => {
            if (!chart) return;

            // Update axes
            if (chart.options.scales) {
                Object.values(chart.options.scales).forEach(scale => {
                    if (scale.ticks) scale.ticks.color = theme.textColor;
                    if (scale.grid) scale.grid.color = theme.gridColor;
                    if (scale.title) scale.title.color = theme.textColor;
                });
            }

            // Update plugins
            if (chart.options.plugins) {
                if (chart.options.plugins.legend && chart.options.plugins.legend.labels) {
                    chart.options.plugins.legend.labels.color = theme.textColor;
                }
                if (chart.options.plugins.title) {
                    chart.options.plugins.title.color = theme.textColor;
                }
            }

            chart.update();
        });
    },

    /**
     * CHART A: Line Chart - Pollutant Levels Over Time
     */
    async renderLineChart(pollutantKey = 'pm25') {
        const canvas = document.getElementById('lineChartCanvas');
        if (!canvas) return;

        if (this.instances.line) {
            this.instances.line.destroy();
        }

        const data = await window.ApiService.getChartData('line', { pollutant: pollutantKey });
        const theme = this.getThemeOptions();

        const ctx = canvas.getContext('2d');
        this.instances.line = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: data.datasets.map(ds => ({
                    ...ds,
                    tension: 0.35,
                    borderWidth: 2.5,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: false
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: theme.textColor,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 16,
                            font: { family: 'inherit', size: 12, weight: '500' }
                        }
                    },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        titleColor: theme.tooltipText,
                        bodyColor: theme.tooltipText,
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return ` ${context.dataset.label}: ${context.parsed.y} µg/m³`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: theme.gridColor },
                        ticks: { color: theme.textColor, font: { family: 'inherit', size: 11 } },
                        title: { display: true, text: 'Observation Date', color: theme.textColor, font: { weight: '600' } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: theme.gridColor },
                        ticks: { color: theme.textColor, font: { family: 'inherit', size: 11 } },
                        title: { display: true, text: 'Concentration (µg/m³)', color: theme.textColor, font: { weight: '600' } }
                    }
                }
            }
        });
    },

    /**
     * CHART B: Bar Chart - Cross-Location Pollutant Comparison
     */
    async renderBarChart() {
        const canvas = document.getElementById('barChartCanvas');
        if (!canvas) return;

        if (this.instances.bar) {
            this.instances.bar.destroy();
        }

        const data = await window.ApiService.getChartData('bar');
        const theme = this.getThemeOptions();

        const ctx = canvas.getContext('2d');
        this.instances.bar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: data.datasets.map(ds => ({
                    ...ds,
                    borderRadius: 6,
                    borderSkipped: false
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: theme.textColor,
                            usePointStyle: true,
                            pointStyle: 'rectRounded',
                            padding: 16,
                            font: { family: 'inherit', size: 12, weight: '500' }
                        }
                    },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        titleColor: theme.tooltipText,
                        bodyColor: theme.tooltipText,
                        padding: 12,
                        cornerRadius: 8
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: theme.textColor, font: { family: 'inherit', size: 11 } },
                        title: { display: true, text: 'Monitoring Station Location', color: theme.textColor, font: { weight: '600' } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: theme.gridColor },
                        ticks: { color: theme.textColor, font: { family: 'inherit', size: 11 } },
                        title: { display: true, text: 'Recorded Mean Value', color: theme.textColor, font: { weight: '600' } }
                    }
                }
            }
        });
    },

    /**
     * CHART C: Histogram - Distribution of Pollutant Readings
     */
    async renderHistogram() {
        const canvas = document.getElementById('histogramCanvas');
        if (!canvas) return;

        if (this.instances.histogram) {
            this.instances.histogram.destroy();
        }

        const data = await window.ApiService.getChartData('histogram');
        const theme = this.getThemeOptions();

        const ctx = canvas.getContext('2d');
        this.instances.histogram = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: data.datasets[0].label,
                    data: data.datasets[0].data,
                    backgroundColor: data.datasets[0].backgroundColor,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        titleColor: theme.tooltipText,
                        bodyColor: theme.tooltipText,
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return ` Frequency: ${context.parsed.y} reading occurrences`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: theme.textColor, font: { family: 'inherit', size: 11 } },
                        title: { display: true, text: 'PM2.5 AQI Exposure Intervals (µg/m³)', color: theme.textColor, font: { weight: '600' } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: theme.gridColor },
                        ticks: { color: theme.textColor, font: { family: 'inherit', size: 11 } },
                        title: { display: true, text: 'Number of Hourly/Daily Readings', color: theme.textColor, font: { weight: '600' } }
                    }
                }
            }
        });
    },

    /**
     * CHART D: Scatter Plot - Relationship Between PM2.5 and PM10
     */
    async renderScatterPlot() {
        const canvas = document.getElementById('scatterCanvas');
        if (!canvas) return;

        if (this.instances.scatter) {
            this.instances.scatter.destroy();
        }

        const data = await window.ApiService.getChartData('scatter');
        const theme = this.getThemeOptions();

        const ctx = canvas.getContext('2d');
        this.instances.scatter = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Particulate Correlation (PM2.5 vs PM10)',
                    data: data.datasets[0].data,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#059669',
                    pointRadius: 5,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: theme.textColor,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 14,
                            font: { family: 'inherit', size: 12, weight: '500' }
                        }
                    },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        titleColor: theme.tooltipText,
                        bodyColor: theme.tooltipText,
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return ` PM2.5: ${context.parsed.x} µg/m³ | PM10: ${context.parsed.y} µg/m³`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: theme.gridColor },
                        ticks: { color: theme.textColor, font: { family: 'inherit', size: 11 } },
                        title: { display: true, text: 'Fine Particulates PM2.5 (µg/m³)', color: theme.textColor, font: { weight: '600' } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: theme.gridColor },
                        ticks: { color: theme.textColor, font: { family: 'inherit', size: 11 } },
                        title: { display: true, text: 'Inhalable Particulates PM10 (µg/m³)', color: theme.textColor, font: { weight: '600' } }
                    }
                }
            }
        });
    },

    /**
     * Export chart canvas as PNG image
     */
    downloadChart(chartKey, filename) {
        const chart = this.instances[chartKey];
        if (!chart) return;

        const link = document.createElement('a');
        link.download = `${filename || 'air_quality_chart'}.png`;
        link.href = chart.toBase64Image('image/png', 1.0);
        link.click();
    }
};

window.ChartsManager = ChartsManager;

