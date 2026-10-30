"""
Air Quality and Pollution Pattern Analysis (DA-013)
Data Loader Service Module (services/data_loader.py)

Handles:
- Secure CSV ingestion and parsing
- Header normalization across heterogeneous schemas
- In-memory registry and disk caching of datasets
- Paginated table retrieval with search and sorting
- AQI calculation and status classification
"""

import os
import uuid
import json
import logging
from typing import Dict, Any, Tuple, Optional, List
import pandas as pd
import numpy as np
from config import Config

logger = logging.getLogger(__name__)

# Canonical column mapping dictionary
COLUMN_ALIASES = {
    'date': ['date', 'timestamp', 'time', 'datetime', 'date_time', 'recorded_date', 'obs_date'],
    'city': ['city', 'region', 'area', 'municipality', 'town', 'district'],
    'location': ['location', 'monitoring_location', 'monitoring_station', 'station', 'site', 'sensor_location', 'station_name'],
    'pm25': ['pm2.5', 'pm2_5', 'pm25', 'pm_25', 'pm-2.5', 'particulate_matter_2.5', 'fine_particles'],
    'pm10': ['pm10', 'pm_10', 'pm-10', 'particulate_matter_10', 'coarse_particles'],
    'no2': ['no2', 'no_2', 'nitrogen_dioxide', 'nitrogendioxide'],
    'so2': ['so2', 'so_2', 'sulfur_dioxide', 'sulfurdioxide'],
    'o3': ['o3', 'o_3', 'ozone', 'tropospheric_ozone']
}

POLLUTANT_COLUMNS = ['pm25', 'pm10', 'no2', 'so2', 'o3']

class DataLoaderService:
    """Manages dataset ingestion, normalization, and session persistence."""

    def __init__(self):
        # In-memory registry of datasets: dataset_id -> dict
        self._datasets: Dict[str, Dict[str, Any]] = {}
        self._active_dataset_id: Optional[str] = None
        self._load_default_sample()

    def _load_default_sample(self):
        """Preload the bundled sample dataset on service initialization."""
        sample_path = Config.SAMPLE_DATASET_PATH
        if os.path.exists(sample_path):
            try:
                dataset_id = "default-sample-2024"
                df = pd.read_csv(sample_path)
                normalized_df, col_map = self.normalize_dataframe(df)
                metadata = self._compute_metadata(dataset_id, "sample_air_quality_data.csv", normalized_df, col_map)
                
                self._datasets[dataset_id] = {
                    'dataset_id': dataset_id,
                    'filename': 'sample_air_quality_data.csv',
                    'df': normalized_df,
                    'raw_df': df.copy(),
                    'cleaned_df': normalized_df.copy(),
                    'metadata': metadata,
                    'is_cleaned': False,
                    'cleaning_log': None
                }
                self._active_dataset_id = dataset_id
                logger.info(f"Preloaded default sample dataset: {dataset_id} ({len(df)} rows)")
            except Exception as e:
                logger.error(f"Failed to preload sample dataset: {e}")

    def get_active_dataset_id(self) -> Optional[str]:
        """Returns the ID of the currently active dataset."""
        return self._active_dataset_id

    def set_active_dataset_id(self, dataset_id: str) -> bool:
        """Sets the active dataset ID."""
        if dataset_id in self._datasets:
            self._active_dataset_id = dataset_id
            return True
        return False

    def get_dataset(self, dataset_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Retrieve dataset package by ID, falling back to active dataset."""
        target_id = dataset_id or self._active_dataset_id
        if not target_id or target_id not in self._datasets:
            return None
        return self._datasets[target_id]

    @staticmethod
    def normalize_column_name(col_name: str) -> str:
        """Normalize an arbitrary column header to a canonical identifier."""
        clean = col_name.strip().lower()
        # Remove parenthetical units e.g. "PM2.5 (ug/m3)" -> "pm2.5"
        clean = clean.split('(')[0].strip()
        clean = clean.replace(' ', '_').replace('-', '_')

        for canonical, aliases in COLUMN_ALIASES.items():
            if clean == canonical or clean in aliases:
                return canonical
            # Substring match check
            for alias in aliases:
                if alias in clean:
                    return canonical
        return clean

    def normalize_dataframe(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, str]]:
        """
        Normalize DataFrame column names to canonical names.
        Returns: (normalized_df, mapping_of_canonical_to_original)
        """
        col_mapping = {}
        original_to_canonical = {}

        for col in df.columns:
            canonical = self.normalize_column_name(col)
            # If canonical already mapped and duplicates exist, retain unique suffix
            if canonical in col_mapping:
                canonical = f"{canonical}_{col}"
            col_mapping[canonical] = col
            original_to_canonical[col] = canonical

        renamed_df = df.rename(columns=original_to_canonical)

        # Ensure date format standard string
        if 'date' in renamed_df.columns:
            try:
                renamed_df['date'] = pd.to_datetime(renamed_df['date'], errors='coerce').dt.strftime('%Y-%m-%d')
            except Exception:
                pass

        # Convert pollutant columns to float where possible
        for poll in POLLUTANT_COLUMNS:
            if poll in renamed_df.columns:
                renamed_df[poll] = pd.to_numeric(renamed_df[poll], errors='coerce')

        return renamed_df, col_mapping

    def ingest_csv_file(self, file_storage, filename: str) -> Tuple[bool, Any, str]:
        """
        Ingest, validate, and register an uploaded CSV file.
        Returns: (success: bool, result_or_metadata: dict, error_message: str)
        """
        if not filename or not filename.lower().endswith('.csv'):
            return False, None, "Invalid file format. Only Comma-Separated Values (.csv) are accepted."

        # Generate unique dataset identifier
        dataset_id = str(uuid.uuid4())
        save_path = os.path.join(Config.UPLOAD_FOLDER, f"{dataset_id}.csv")

        try:
            file_storage.save(save_path)
        except Exception as e:
            return False, None, f"Failed to save uploaded file: {str(e)}"

        # Validate file size
        file_size = os.path.getsize(save_path)
        if file_size == 0:
            os.remove(save_path)
            return False, None, "The uploaded CSV file is empty (0 bytes)."

        # Read CSV with pandas (multi-encoding fallback)
        df = None
        for encoding in ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']:
            try:
                df = pd.read_csv(save_path, encoding=encoding)
                break
            except (UnicodeDecodeError, pd.errors.EmptyDataError):
                continue
            except pd.errors.ParserError as pe:
                os.remove(save_path)
                return False, None, f"Malformed CSV structure: {str(pe)}"

        if df is None or df.empty:
            if os.path.exists(save_path): os.remove(save_path)
            return False, None, "Could not parse valid records from CSV file. Verify headers and rows."

        # Check that at least some relevant columns exist
        normalized_df, col_map = self.normalize_dataframe(df)
        available_pollutants = [p for p in POLLUTANT_COLUMNS if p in normalized_df.columns]

        if not available_pollutants and 'date' not in normalized_df.columns and 'location' not in normalized_df.columns:
            if os.path.exists(save_path): os.remove(save_path)
            return False, None, "Unrecognized environmental dataset schema. Expected Date, Location, or Pollutant columns (PM2.5, PM10, NO2, SO2, O3)."

        # Compute metadata
        metadata = self._compute_metadata(dataset_id, filename, normalized_df, col_map)
        metadata['fileSize'] = file_size

        # Register in memory
        self._datasets[dataset_id] = {
            'dataset_id': dataset_id,
            'filename': filename,
            'filepath': save_path,
            'df': normalized_df,
            'raw_df': df.copy(),
            'cleaned_df': normalized_df.copy(),
            'metadata': metadata,
            'is_cleaned': False,
            'cleaning_log': None
        }
        self._active_dataset_id = dataset_id

        # Persist metadata JSON
        meta_path = os.path.join(Config.UPLOAD_FOLDER, f"{dataset_id}_meta.json")
        try:
            with open(meta_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2)
        except Exception as e:
            logger.warning(f"Could not write metadata JSON: {e}")

        logger.info(f"Successfully ingested dataset: {dataset_id} ({len(normalized_df)} rows, {filename})")
        return True, metadata, "File uploaded and registered successfully."

    def _compute_metadata(self, dataset_id: str, filename: str, df: pd.DataFrame, col_map: Dict[str, str]) -> Dict[str, Any]:
        """Compute structured metadata matching the frontend's expectations."""
        total_records = len(df)
        
        # Locations & Cities
        locations = []
        if 'location' in df.columns:
            locations = [str(loc) for loc in df['location'].dropna().unique().tolist()]

        cities = []
        if 'city' in df.columns:
            cities = [str(c) for c in df['city'].dropna().unique().tolist()]
        elif locations:
            cities = ["Region 1"]

        # Pollutants
        pollutants_available = []
        for p in POLLUTANT_COLUMNS:
            if p in df.columns:
                display_name = {
                    'pm25': 'PM2.5', 'pm10': 'PM10', 'no2': 'NO2', 'so2': 'SO2', 'o3': 'O3'
                }.get(p, p.upper())
                pollutants_available.append(display_name)

        # Date Range
        start_date = "N/A"
        end_date = "N/A"
        if 'date' in df.columns:
            valid_dates = df['date'].dropna()
            if not valid_dates.empty:
                start_date = str(valid_dates.min())
                end_date = str(valid_dates.max())

        # Completeness rate
        total_cells = df.size
        null_cells = int(df.isnull().sum().sum())
        completeness = ((total_cells - null_cells) / total_cells * 100) if total_cells > 0 else 100.0

        return {
            'datasetId': dataset_id,
            'filename': filename,
            'totalRecords': total_records,
            'locationsCount': len(locations),
            'locations': locations,
            'cities': cities,
            'pollutantsAvailable': pollutants_available,
            'dateRange': {
                'start': start_date,
                'end': end_date
            },
            'completenessRate': f"{completeness:.1f}%",
            'columns': list(df.columns),
            'originalColumnMap': col_map
        }

    @staticmethod
    def calculate_aqi_pm25(pm25_val: float) -> Tuple[int, str]:
        """
        Calculate US EPA standard Air Quality Index based on PM2.5 (µg/m³).
        Returns: (aqi_integer, status_label)
        """
        if pd.isna(pm25_val) or pm25_val < 0:
            return 0, "Unknown"

        # Breakpoints (C_low, C_high, I_low, I_high, Label)
        breakpoints = [
            (0.0, 12.0, 0, 50, "Good"),
            (12.1, 35.4, 51, 100, "Moderate"),
            (35.5, 55.4, 101, 150, "Unhealthy for Sensitive Groups"),
            (55.5, 150.4, 151, 200, "Unhealthy"),
            (150.5, 250.4, 201, 300, "Very Unhealthy"),
            (250.5, 500.4, 301, 500, "Hazardous")
        ]

        for c_low, c_high, i_low, i_high, status in breakpoints:
            if c_low <= pm25_val <= c_high:
                aqi = int(((i_high - i_low) / (c_high - c_low)) * (pm25_val - c_low) + i_low)
                return max(0, min(500, aqi)), status

        if pm25_val > 500.4:
            return 500, "Hazardous"

        return 50, "Moderate"

    def get_preview_records(self, dataset_id: Optional[str] = None, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Return filtered, sorted, paginated records for the preview table.
        """
        dataset = self.get_dataset(dataset_id)
        if not dataset:
            return {
                'total': 0, 'page': 1, 'limit': 10, 'totalPages': 0, 'data': [], 'columns': []
            }

        df = dataset['cleaned_df'] if dataset['is_cleaned'] else dataset['df']
        records_df = df.copy()

        # Add computed ID if absent
        if 'id' not in records_df.columns:
            records_df.insert(0, 'id', range(1, len(records_df) + 1))

        params = params or {}
        search = str(params.get('search', '')).strip().lower()
        city = str(params.get('city', 'All')).strip()
        location = str(params.get('location', 'All')).strip()
        sort_col = str(params.get('sortColumn', 'id')).strip()
        sort_dir = str(params.get('sortDir', 'asc')).strip().lower()
        page = max(1, int(params.get('page', 1)))
        limit = max(1, min(100, int(params.get('limit', 10))))

        # Apply Search
        if search:
            mask = pd.Series(False, index=records_df.index)
            for c in ['date', 'city', 'location']:
                if c in records_df.columns:
                    mask = mask | records_df[c].astype(str).str.lower().str.contains(search, na=False)
            records_df = records_df[mask]

        # Apply City Filter
        if city and city != 'All' and 'city' in records_df.columns:
            records_df = records_df[records_df['city'] == city]

        # Apply Location Filter
        if location and location != 'All' and 'location' in records_df.columns:
            records_df = records_df[records_df['location'] == location]

        # Apply Sorting
        if sort_col in records_df.columns:
            ascending = (sort_dir != 'desc')
            records_df = records_df.sort_values(by=sort_col, ascending=ascending)

        total = len(records_df)
        total_pages = max(1, (total + limit - 1) // limit)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit

        paged_df = records_df.iloc[start_idx:end_idx]

        # Format rows for JSON consumption
        output_rows = []
        for _, row in paged_df.iterrows():
            pm25_val = float(row['pm25']) if 'pm25' in row and pd.notna(row['pm25']) else 0.0
            pm10_val = float(row['pm10']) if 'pm10' in row and pd.notna(row['pm10']) else 0.0
            no2_val = float(row['no2']) if 'no2' in row and pd.notna(row['no2']) else 0.0
            so2_val = float(row['so2']) if 'so2' in row and pd.notna(row['so2']) else 0.0
            o3_val = float(row['o3']) if 'o3' in row and pd.notna(row['o3']) else 0.0

            aqi, status = self.calculate_aqi_pm25(pm25_val)

            output_rows.append({
                'id': int(row.get('id', 0)),
                'date': str(row.get('date', 'N/A')),
                'city': str(row.get('city', 'Unknown')),
                'location': str(row.get('location', 'General Station')),
                'pm25': round(pm25_val, 1),
                'pm10': round(pm10_val, 1),
                'no2': round(no2_val, 1),
                'so2': round(so2_val, 1),
                'o3': round(o3_val, 1),
                'aqi': aqi,
                'status': status
            })

        return {
            'total': total,
            'page': page,
            'limit': limit,
            'totalPages': total_pages,
            'data': output_rows,
            'columns': list(records_df.columns)
        }

# Global singleton loader service
data_loader_service = DataLoaderService()

