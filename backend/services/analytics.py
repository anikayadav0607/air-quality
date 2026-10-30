"""
Air Quality and Pollution Pattern Analysis (DA-013)
Descriptive Analytics Service Module (services/analytics.py)

Handles:
- Parametric filtering (temporal window, geographical sector, pollutant species)
- Descriptive statistical metrics (mean, median, min, max, variance)
- Station-by-station comparative aggregations
- Unit-aware analysis with strict validation boundaries
"""

import logging
from typing import Dict, Any, Optional, List
import pandas as pd
import numpy as np
from config import Config
from services.data_loader import data_loader_service, POLLUTANT_COLUMNS

logger = logging.getLogger(__name__)

# Unit attribution map
POLLUTANT_UNITS = {
    'pm25': 'µg/m³',
    'pm10': 'µg/m³',
    'no2': 'ppb',
    'so2': 'ppb',
    'o3': 'ppb'
}

POLLUTANT_DISPLAY_NAMES = {
    'pm25': 'PM2.5 (Fine Particulates)',
    'pm10': 'PM10 (Coarse Particulates)',
    'no2': 'Nitrogen Dioxide (NO2)',
    'so2': 'Sulfur Dioxide (SO2)',
    'o3': 'Ground-level Ozone (O3)'
}

class AnalyticsService:
    """Computes descriptive environmental statistical metrics."""

    @staticmethod
    def calculate_analysis(dataset_id: Optional[str] = None, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Compute descriptive analysis based on query filters.
        """
        dataset = data_loader_service.get_dataset(dataset_id)
        filters = filters or {}

        # Default empty response
        pollutant = str(filters.get('pollutant', 'pm25')).lower().replace('.', '').replace('_', '')
        if pollutant not in POLLUTANT_COLUMNS:
            pollutant = 'pm25'

        unit = POLLUTANT_UNITS.get(pollutant, 'µg/m³')
        pollutant_name = POLLUTANT_DISPLAY_NAMES.get(pollutant, pollutant.upper())

        empty_result = {
            'count': 0,
            'average': 0.0,
            'median': 0.0,
            'max': 0.0,
            'maxLocation': 'N/A',
            'maxDate': 'N/A',
            'min': 0.0,
            'minLocation': 'N/A',
            'minDate': 'N/A',
            'unit': unit,
            'pollutant': pollutant,
            'pollutantName': pollutant_name,
            'stationAverages': [],
            'dailyAverages': [],
            'monthlyAverages': [],
            'guidelineThreshold': Config.WHO_GUIDELINES.get(pollutant, {}).get('limit', 0.0)
        }

        if not dataset:
            return empty_result

        # Prefer cleaned_df if cleaning has been run, otherwise raw normalized df
        df = dataset['cleaned_df'] if dataset['is_cleaned'] else dataset['df']
        if df.empty or pollutant not in df.columns:
            return empty_result

        filtered_df = df.copy()

        # 1. Date filters
        start_date = filters.get('startDate') or filters.get('start_date')
        end_date = filters.get('endDate') or filters.get('end_date')

        if start_date and 'date' in filtered_df.columns:
            filtered_df = filtered_df[filtered_df['date'] >= str(start_date)]
        if end_date and 'date' in filtered_df.columns:
            filtered_df = filtered_df[filtered_df['date'] <= str(end_date)]

        # 2. City filter
        city = filters.get('city')
        if city and city != 'All' and 'city' in filtered_df.columns:
            filtered_df = filtered_df[filtered_df['city'] == city]

        # 3. Location filter
        location = filters.get('location')
        if location and location != 'All' and 'location' in filtered_df.columns:
            filtered_df = filtered_df[filtered_df['location'] == location]

        # Filter out NaN values for the specific target pollutant
        valid_series = filtered_df[pollutant].dropna()
        valid_count = len(valid_series)

        if valid_count == 0:
            return empty_result

        # Compute key descriptive statistics
        mean_val = float(valid_series.mean())
        median_val = float(valid_series.median())
        max_val = float(valid_series.max())
        min_val = float(valid_series.min())

        # Find max and min rows
        max_sub = filtered_df[filtered_df[pollutant] == max_val]
        min_sub = filtered_df[filtered_df[pollutant] == min_val]

        max_row = max_sub.iloc[0] if not max_sub.empty else filtered_df.iloc[0]
        min_row = min_sub.iloc[0] if not min_sub.empty else filtered_df.iloc[0]

        max_loc = f"{max_row.get('location', 'Station')} ({max_row.get('city', 'City')})" if 'location' in max_row else "Station"
        min_loc = f"{min_row.get('location', 'Station')} ({min_row.get('city', 'City')})" if 'location' in min_row else "Station"
        max_date = str(max_row.get('date', 'N/A'))
        min_date = str(min_row.get('date', 'N/A'))

        # Station-by-station averages
        station_averages = []
        if 'location' in filtered_df.columns:
            grouped = filtered_df.groupby('location')
            for loc_name, group in grouped:
                loc_valid = group[pollutant].dropna()
                if not loc_valid.empty:
                    city_name = str(group['city'].iloc[0]) if 'city' in group.columns else 'Unknown'
                    station_averages.append({
                        'location': str(loc_name),
                        'city': city_name,
                        'average': round(float(loc_valid.mean()), 1),
                        'samples': int(len(loc_valid)),
                        'max': round(float(loc_valid.max()), 1),
                        'min': round(float(loc_valid.min()), 1)
                    })

            station_averages.sort(key=lambda s: s['average'], reverse=True)

        # Daily averages
        daily_averages = []
        if 'date' in filtered_df.columns:
            daily_grouped = filtered_df.groupby('date')[pollutant].agg(['mean', 'count']).reset_index()
            for _, d_row in daily_grouped.iterrows():
                daily_averages.append({
                    'date': str(d_row['date']),
                    'average': round(float(d_row['mean']), 1),
                    'samples': int(d_row['count'])
                })

        # Monthly averages
        monthly_averages = []
        if 'date' in filtered_df.columns:
            try:
                temp_df = filtered_df.copy()
                temp_df['month'] = pd.to_datetime(temp_df['date']).dt.strftime('%Y-%m')
                month_grouped = temp_df.groupby('month')[pollutant].agg(['mean', 'count']).reset_index()
                for _, m_row in month_grouped.iterrows():
                    monthly_averages.append({
                        'month': str(m_row['month']),
                        'average': round(float(m_row['mean']), 1),
                        'samples': int(m_row['count'])
                    })
            except Exception as e:
                logger.warning(f"Could not compute monthly averages: {e}")

        who_thresh = Config.WHO_GUIDELINES.get(pollutant, {}).get('limit', 0.0)

        return {
            'count': valid_count,
            'average': round(mean_val, 1),
            'median': round(median_val, 1),
            'max': round(max_val, 1),
            'maxLocation': max_loc,
            'maxDate': max_date,
            'min': round(min_val, 1),
            'minLocation': min_loc,
            'minDate': min_date,
            'unit': unit,
            'pollutant': pollutant,
            'pollutantName': pollutant_name,
            'guidelineThreshold': who_thresh,
            'stationAverages': station_averages,
            'dailyAverages': daily_averages,
            'monthlyAverages': monthly_averages
        }

# Global singleton analytics service
analytics_service = AnalyticsService()

