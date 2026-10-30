"""
Air Quality and Pollution Pattern Analysis (DA-013)
Backend Configuration Module (config.py)
"""

import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

class Config:
    """Application configuration parameters."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'da013-environmental-analytics-secret-key-2024')
    
    # Storage locations
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    OUTPUT_FOLDER = os.path.join(BASE_DIR, 'outputs')
    SAMPLE_DATASET_PATH = os.path.join(PROJECT_ROOT, 'frontend', 'assets', 'sample_air_quality_data.csv')
    
    # Upload constraints
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload size
    ALLOWED_EXTENSIONS = {'csv'}
    
    # API Configuration
    API_PREFIX = '/api'
    HOST = os.environ.get('HOST', '127.0.0.1')
    PORT = int(os.environ.get('PORT', 5000))
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() in ('true', '1', 't')
    
    # Environmental Standard Guidelines (WHO 24-hour benchmarks)
    WHO_GUIDELINES = {
        'pm25': {'limit': 15.0, 'unit': 'µg/m³', 'name': 'Fine Particulate Matter (PM2.5)'},
        'pm10': {'limit': 45.0, 'unit': 'µg/m³', 'name': 'Coarse Particulate Matter (PM10)'},
        'no2':  {'limit': 25.0, 'unit': 'ppb',   'name': 'Nitrogen Dioxide (NO2)'},
        'so2':  {'limit': 40.0, 'unit': 'ppb',   'name': 'Sulfur Dioxide (SO2)'},
        'o3':   {'limit': 50.0, 'unit': 'ppb',   'name': 'Ground-level Ozone (O3)'}
    }
    
    # Disclaimer text required by project specification
    DISCLAIMER = (
        "This application presents descriptive analysis of recorded measurements. "
        "Missing values are not treated as zero, and comparisons must account for "
        "measurement units, monitoring locations, and data quality. The results "
        "do not establish pollution causes or provide medical conclusions."
    )

# Ensure required directories exist
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
os.makedirs(Config.OUTPUT_FOLDER, exist_ok=True)

