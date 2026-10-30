"""
Air Quality and Pollution Pattern Analysis (DA-013)
Chart Generation Service Module (services/chart_service.py)

Generates Chart.js compatible JSON structures for:
1. Line Chart: Date-wise pollutant trajectories by monitoring station
2. Bar Chart: Multi-station comparison of pollutant mean concentrations
3. Histogram: Exposure frequency distribution binned into health intervals
4. Scatter Plot: PM2.5 vs PM10 correlation analysis with Pearson's r
"""

import logging
from typing import Dict, Any, Optional, List
import pandas as pd
import numpy as np
from services.data_loader import data_loader_service, POLLUTANT_COLUMNS

logger = logging.getLogger(__name__)

# Standard Chart Color Palette
CHART_COLORS = [
    {"border": "#10b981", "bg": "rgba(16, 185, 129, 0.15)"},
    {"border": "#ef4444", "bg": "rgba(239, 68, 68, 0.15)"},
    {"border": "#0284c7", "bg": "rgba(2, 132, 199, 0.15)"},
    {"border": "#f59e0b", "bg": "rgba(245, 158, 11, 0.15)"},
    {"border": "#8b5cf6", "bg": "rgba(139, 92, 246, 0.15)"},
    {"border": "#0d9488", "bg": "rgba(13, 148, 136, 0.15)"}
]

class ChartService:
    """Formats processed environmental data for Chart.js canvases."""

    @staticmethod
    def get_chart_data(dataset_id: Optional[str] = None, chart_type: str = 'line', params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Produce Chart.js ready JSON for the specified chart type.
        """
        dataset = data_loader_service.get_dataset(dataset_id)
        params = params or {}
        chart_type = chart_type.lower()

        if not dataset:
            return {'labels': [], 'datasets': []}

        df = dataset['cleaned_df'] if dataset['is_cleaned'] else dataset['df']
        if df.empty:
            return {'labels': [], 'datasets': []}

        if chart_type == 'line':
            return ChartService._generate_line_chart(df, params)
        elif chart_type == 'bar':
            return ChartService._generate_bar_chart(df, params)
        elif chart_type == 'histogram':
            return ChartService._generate_histogram(df, params)
        elif chart_type == 'scatter':
            return ChartService._generate_scatter_plot(df, params)
        else:
            raise ValueError(f"Unsupported chart type: {chart_type}")

    @staticmethod
    def _generate_line_chart(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, Any]:
        """Date-wise pollutant trend comparing monitoring stations."""
        pollutant = str(params.get('pollutant', 'pm25')).lower().replace('.', '').replace('_', '')
        if pollutant not in df.columns:
            pollutant = next((p for p in POLLUTANT_COLUMNS if p in df.columns), 'pm25')

        if 'date' not in df.columns or pollutant not in df.columns:
            return {'labels': [], 'datasets': []}

        # Filter valid dates and values
        valid_df = df.dropna(subset=['date', pollutant]).sort_values(by='date')
        unique_dates = valid_df['date'].unique().tolist()

        datasets = []
        if 'location' in valid_df.columns:
            locations = valid_df['location'].unique().tolist()
            # Select up to 4 top locations for clean readability
            for idx, loc in enumerate(locations[:4]):
                loc_df = valid_df[valid_df['location'] == loc]
                date_val_map = dict(zip(loc_df['date'], loc_df[pollutant]))
                data_points = [round(float(date_val_map.get(d, np.nan)), 1) if d in date_val_map else None for d in unique_dates]

                color = CHART_COLORS[idx % len(CHART_COLORS)]
                datasets.append({
                    'label': f"{loc} ({pollutant.upper()})",
                    'data': data_points,
                    'borderColor': color['border'],
                    'backgroundColor': color['bg'],
                    'spanGaps': True
                })
        else:
            # Overall mean trajectory by date
            daily_means = valid_df.groupby('date')[pollutant].mean()
            datasets.append({
                'label': f"Mean {pollutant.upper()} Concentration",
                'data': [round(float(daily_means.get(d, 0.0)), 1) for d in unique_dates],
                'borderColor': '#10b981',
                'backgroundColor': 'rgba(16, 185, 129, 0.15)'
            })

        return {
            'labels': unique_dates,
            'datasets': datasets,
            'pollutant': pollutant
        }

    @staticmethod
    def _generate_bar_chart(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, Any]:
        """Location-wise pollutant comparison across stations."""
        if 'location' not in df.columns:
            return {'labels': [], 'datasets': []}

        # Available pollutants in dataframe
        available_polls = [p for p in ['pm25', 'pm10', 'no2'] if p in df.columns]
        if not available_polls:
            available_polls = [p for p in POLLUTANT_COLUMNS if p in df.columns]

        stations = df['location'].dropna().unique().tolist()
        datasets = []

        palette = [
            {'label': 'PM2.5 Mean (µg/m³)', 'key': 'pm25', 'color': '#10b981'},
            {'label': 'PM10 Mean (µg/m³)',  'key': 'pm10', 'color': '#0284c7'},
            {'label': 'NO2 Mean (ppb)',     'key': 'no2',  'color': '#f59e0b'},
            {'label': 'SO2 Mean (ppb)',     'key': 'so2',  'color': '#8b5cf6'},
            {'label': 'O3 Mean (ppb)',      'key': 'o3',   'color': '#0d9488'}
        ]

        for item in palette:
            p_key = item['key']
            if p_key in df.columns:
                means = []
                for st in stations:
                    val = df[df['location'] == st][p_key].dropna().mean()
                    means.append(round(float(val), 1) if pd.notna(val) else 0.0)

                datasets.append({
                    'label': item['label'],
                    'data': means,
                    'backgroundColor': item['color']
                })

        return {
            'labels': stations,
            'datasets': datasets
        }

    @staticmethod
    def _generate_histogram(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, Any]:
        """Distribution of pollutant readings categorized into health risk intervals."""
        pollutant = str(params.get('pollutant', 'pm25')).lower().replace('.', '').replace('_', '')
        if pollutant not in df.columns:
            pollutant = 'pm25' if 'pm25' in df.columns else (POLLUTANT_COLUMNS[0] if POLLUTANT_COLUMNS else None)

        if not pollutant or pollutant not in df.columns:
            return {'labels': [], 'datasets': []}

        series = df[pollutant].dropna()
        if series.empty:
            return {'labels': [], 'datasets': []}

        # US EPA AQI Intervals for PM2.5 (or proportionate bins for others)
        if pollutant == 'pm25':
            bins = [0, 12.0, 35.4, 55.4, 150.4, float('inf')]
            labels = [
                "0 - 12 (Good)",
                "12.1 - 35.4 (Moderate)",
                "35.5 - 55.4 (Unhealthy Sens.)",
                "55.5 - 150.4 (Unhealthy)",
                "150.5+ (Very Unhealthy)"
            ]
        elif pollutant == 'pm10':
            bins = [0, 45.0, 100.0, 150.0, 250.0, float('inf')]
            labels = [
                "0 - 45 (Good)",
                "45.1 - 100 (Moderate)",
                "100.1 - 150 (Sensitive)",
                "150.1 - 250 (Unhealthy)",
                "250+ (Very Unhealthy)"
            ]
        else:
            # Quintile auto-bins
            q_min, q_max = series.min(), series.max()
            step = max((q_max - q_min) / 5.0, 1.0)
            bins = [q_min - 0.001, q_min + step, q_min + 2*step, q_min + 3*step, q_min + 4*step, q_max + 0.001]
            labels = [
                f"{bins[0]:.1f} - {bins[1]:.1f}",
                f"{bins[1]:.1f} - {bins[2]:.1f}",
                f"{bins[2]:.1f} - {bins[3]:.1f}",
                f"{bins[3]:.1f} - {bins[4]:.1f}",
                f"{bins[4]:.1f} - {bins[5]:.1f}"
            ]

        counts, _ = np.histogram(series, bins=bins)
        colors = ["#10b981", "#facc15", "#f97316", "#ef4444", "#7c3aed"]

        return {
            'labels': labels,
            'datasets': [{
                'label': f"Frequency Distribution ({pollutant.upper()})",
                'data': [int(c) for c in counts],
                'backgroundColor': colors[:len(counts)]
            }]
        }

    @staticmethod
    def _generate_scatter_plot(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, Any]:
        """PM2.5 vs PM10 scatter relationship with Pearson correlation coefficient."""
        if 'pm25' not in df.columns or 'pm10' not in df.columns:
            return {'correlationR': 0.0, 'datasets': [{'label': 'No PM data', 'data': []}]}

        paired = df[['pm25', 'pm10']].dropna()
        if paired.empty:
            return {'correlationR': 0.0, 'datasets': [{'label': 'No valid pairs', 'data': []}]}

        # Limit to 300 points for canvas performance
        sampled = paired.sample(n=min(len(paired), 300), random_state=42) if len(paired) > 300 else paired

        # Pearson correlation
        corr_matrix = np.corrcoef(paired['pm25'], paired['pm10'])
        r_val = float(corr_matrix[0, 1]) if not np.isnan(corr_matrix[0, 1]) else 0.0

        scatter_points = [
            {'x': round(float(row['pm25']), 1), 'y': round(float(row['pm10']), 1)}
            for _, row in sampled.iterrows()
        ]

        return {
            'correlationR': round(r_val, 2),
            'datasets': [{
                'label': f"Particulate Correlation (PM2.5 vs PM10, r = {r_val:.2f})",
                'data': scatter_points,
                'backgroundColor': "rgba(16, 185, 129, 0.65)",
                'borderColor': "#059669"
            }]
        }

# Global singleton chart service
chart_service = ChartService()

