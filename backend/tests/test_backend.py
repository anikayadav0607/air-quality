"""
Air Quality and Pollution Pattern Analysis (DA-013)
Comprehensive Backend Test Suite (tests/test_backend.py)
"""

import os
import sys
import io
import unittest
import json
import pandas as pd

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from config import Config

class BackendAnalyticsTestCase(unittest.TestCase):
    """Test suite for Flask endpoints and data analytics pipelines."""

    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    def test_01_health_check(self):
        """Test GET /api/health endpoint."""
        res = self.client.get('/api/health')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertIn('status', data['data'])
        self.assertEqual(data['data']['status'], 'healthy')

    def test_02_default_sample_dataset_info(self):
        """Test GET /api/dataset/info preloaded state."""
        res = self.client.get('/api/dataset/info')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertGreater(data['data']['totalRecords'], 0)
        self.assertIn('locations', data['data'])
        self.assertIn('pollutantsAvailable', data['data'])

    def test_03_valid_csv_upload(self):
        """Test POST /api/upload with valid CSV content."""
        csv_content = (
            "date,location,city,pm25,pm10,no2,so2,o3\n"
            "2024-05-01,Test Station Alpha,Metro,35.2,55.0,22.1,8.4,45.0\n"
            "2024-05-02,Test Station Beta,Metro,42.0,68.4,28.0,10.2,40.5\n"
            "2024-05-03,Test Station Alpha,Metro,29.4,48.2,18.5,6.1,50.2\n"
        )
        data = {
            'file': (io.BytesIO(csv_content.encode('utf-8')), 'test_valid_air.csv')
        }
        res = self.client.post('/api/upload', data=data, content_type='multipart/form-data')
        self.assertEqual(res.status_code, 201)
        res_data = res.get_json()
        self.assertTrue(res_data['success'])
        self.assertIn('datasetId', res_data['data'])
        self.assertEqual(res_data['data']['totalRecords'], 3)
        self.assertEqual(len(res_data['data']['locations']), 2)

    def test_04_invalid_file_extension(self):
        """Test upload rejection for non-CSV files."""
        data = {
            'file': (io.BytesIO(b"executable content"), 'test.exe')
        }
        res = self.client.post('/api/upload', data=data, content_type='multipart/form-data')
        self.assertEqual(res.status_code, 400)
        res_data = res.get_json()
        self.assertFalse(res_data['success'])
        self.assertEqual(res_data['error'], 'InvalidCSVError')

    def test_05_empty_dataset_rejection(self):
        """Test upload rejection for empty 0-byte CSV file."""
        data = {
            'file': (io.BytesIO(b""), 'empty.csv')
        }
        res = self.client.post('/api/upload', data=data, content_type='multipart/form-data')
        self.assertEqual(res.status_code, 400)
        res_data = res.get_json()
        self.assertFalse(res_data['success'])

    def test_06_data_preview_and_sorting(self):
        """Test GET /api/dataset/preview with search, pagination, and sorting."""
        res = self.client.get('/api/dataset/preview?page=1&limit=5&sortColumn=date&sortDir=asc')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertIn('data', data['data'])
        self.assertLessEqual(len(data['data']['data']), 5)
        # Check that records have computed AQI
        if data['data']['data']:
            first_record = data['data']['data'][0]
            self.assertIn('aqi', first_record)
            self.assertIn('status', first_record)

    def test_07_data_quality_audit(self):
        """Test GET /api/data-quality distinguishing missing vs zeros vs invalid."""
        res = self.client.get('/api/data-quality')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        metrics = data['data']['metrics']
        self.assertIn('totalRowsScanned', metrics)
        self.assertIn('missingValues', metrics)
        self.assertIn('duplicateRecords', metrics)
        self.assertIn('healthScore', metrics)

    def test_08_data_cleaning_pipeline(self):
        """Test POST /api/data-quality/clean with deduplication and median imputation."""
        payload = {
            'drop_duplicates': True,
            'drop_invalid_dates': True,
            'clamp_negative': True,
            'impute_method': 'median'
        }
        res = self.client.post('/api/data-quality/clean', json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertIn('downloadUrl', data['data'])

    def test_09_descriptive_analysis_with_filters(self):
        """Test POST /api/analysis/pollution with pollutant and location filters."""
        payload = {
            'pollutant': 'pm25',
            'city': 'All',
            'location': 'All'
        }
        res = self.client.post('/api/analysis/pollution', json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertIn('average', data['data'])
        self.assertIn('max', data['data'])
        self.assertIn('min', data['data'])
        self.assertEqual(data['data']['unit'], 'µg/m³')

    def test_10_charts_generation(self):
        """Test Chart.js data generation for all 4 required charts."""
        for c_type in ['line', 'bar', 'histogram', 'scatter']:
            res = self.client.get(f'/api/charts/data?type={c_type}&pollutant=pm25')
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertTrue(data['success'])
            chart_obj = data['data']
            if c_type == 'scatter':
                self.assertIn('correlationR', chart_obj)
            else:
                self.assertIn('labels', chart_obj)
            self.assertIn('datasets', chart_obj)

    def test_11_cleaned_csv_download(self):
        """Test GET /api/export/csv file streaming."""
        res = self.client.get('/api/export/csv')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.mimetype, 'text/csv')
        self.assertIn('Content-Disposition', res.headers)

    def test_12_executive_report_generation(self):
        """Test GET /api/export/report in JSON and TXT format."""
        # JSON format
        res_json = self.client.get('/api/export/report?format=json')
        self.assertEqual(res_json.status_code, 200)
        data = res_json.get_json()
        self.assertTrue(data['success'])
        self.assertIn('projectCode', data['data'])
        self.assertEqual(data['data']['projectCode'], 'DA-013')
        self.assertIn('disclaimer', data['data'])

        # TXT download format
        res_txt = self.client.get('/api/export/report?format=txt')
        self.assertEqual(res_txt.status_code, 200)
        self.assertEqual(res_txt.mimetype, 'text/plain')

    def test_13_sklearn_outlier_detection(self):
        """Test Scikit-learn IsolationForest multivariate outlier detection."""
        res = self.client.get('/api/ml/outliers?contamination=0.05')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertIn('outlierCount', data['data'])
        self.assertIn('outliers', data['data'])
        self.assertEqual(data['data']['method'], 'Scikit-learn IsolationForest')

    def test_14_sklearn_station_clustering(self):
        """Test Scikit-learn KMeans station risk clustering."""
        res = self.client.get('/api/ml/clusters?clusters=3')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['algorithm'], 'Scikit-learn KMeans')
        self.assertIn('stations', data['data'])
        if data['data']['stations']:
            self.assertIn('riskProfile', data['data']['stations'][0])

    def test_15_sklearn_trend_forecasting(self):
        """Test Scikit-learn LinearRegression temporal trend modeling."""
        res = self.client.get('/api/ml/trend?pollutant=pm25&days=5')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['algorithm'], 'Scikit-learn LinearRegression')
        self.assertIn('slopePerDay', data['data'])
        self.assertIn('forecast', data['data'])
        self.assertEqual(len(data['data']['forecast']), 5)

    def test_16_persistent_analysis_storage(self):
        """Test persistent disk storage and retrieval of full analysis."""
        # Persist analysis
        res_post = self.client.post('/api/analysis/persist', json={'notes': 'Automated test run'})
        self.assertEqual(res_post.status_code, 200)
        data_post = res_post.get_json()
        self.assertTrue(data_post['success'])
        self.assertIn('persistentFilePath', data_post['data'])
        self.assertTrue(os.path.exists(data_post['data']['persistentFilePath']))

        # Retrieve persistent analysis
        res_get = self.client.get('/api/analysis/persistent')
        self.assertEqual(res_get.status_code, 200)
        data_get = res_get.get_json()
        self.assertTrue(data_get['success'])
        self.assertIn('scikitLearnML', data_get['data'])

    def test_17_cleaning_with_outlier_filtering(self):
        """Test dataset cleaning pipeline with Scikit-learn outlier filtering enabled."""
        payload = {
            'drop_duplicates': True,
            'drop_invalid_dates': True,
            'clamp_negative': True,
            'impute_method': 'median',
            'filter_outliers': True,
            'contamination': 0.05
        }
        res = self.client.post('/api/data-quality/clean', json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertIn('outliersFiltered', data['data']['metrics'])

if __name__ == '__main__':
    unittest.main()
