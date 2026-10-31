"""
Air Quality and Pollution Pattern Analysis (DA-013)
Flask Application Controller (app.py)

REST API Endpoints:
- GET  /api/health
- POST /api/upload
- GET  /api/dataset/info
- GET  /api/dataset/<dataset_id>/info
- GET  /api/dataset/preview
- GET  /api/dataset/<dataset_id>/preview
- GET  /api/data-quality
- GET  /api/dataset/<dataset_id>/quality
- POST /api/data-quality/clean
- POST /api/dataset/<dataset_id>/clean
- GET  /api/analysis/pollution
- POST /api/analysis/pollution
- POST /api/dataset/<dataset_id>/analysis
- GET  /api/charts/data
- POST /api/charts/data
- POST /api/dataset/<dataset_id>/charts
- GET  /api/export/csv
- GET  /api/dataset/<dataset_id>/download
- GET  /api/export/report
- GET  /api/dataset/<dataset_id>/report
- GET  /api/dataset/<dataset_id>/report/download
- GET/POST /api/ml/outliers
- GET/POST /api/ml/clusters
- GET/POST /api/ml/trend
- POST /api/analysis/persist
- GET  /api/analysis/persistent
"""

import os
import logging
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from config import Config
from services.data_loader import data_loader_service
from services.data_cleaner import data_cleaner_service
from services.analytics import analytics_service
from services.chart_service import chart_service
from services.report_service import report_service
from services.ml_service import ml_service

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

def create_app():
    """Application factory for the Flask REST API + static frontend server."""
    # Disable Flask's built-in /static route; we serve the frontend ourselves.
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)

    # Enable CORS for all API origins (allows external tools / dev servers)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # =========================================================================
    # FRONTEND STATIC FILE SERVING
    # =========================================================================
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        """Serve the frontend SPA from the /frontend directory."""
        target = os.path.join(Config.FRONTEND_FOLDER, path) if path else None
        if path and target and os.path.exists(target) and os.path.isfile(target):
            return send_from_directory(Config.FRONTEND_FOLDER, path)
        return send_from_directory(Config.FRONTEND_FOLDER, 'index.html')

    def api_response(data=None, message="Operation completed successfully", status_code=200):
        """
        Produce a unified API response matching project standards:
        { "success": True, "data": ..., "message": ... }
        Also merges dictionary data keys at top-level for backwards compatibility.
        """
        payload = {
            'success': True,
            'message': message,
            'data': data
        }
        if isinstance(data, dict):
            for k, v in data.items():
                if k not in payload:
                    payload[k] = v
        return jsonify(payload), status_code

    def api_error(message: str, error_type: str = "ClientError", status_code: int = 400):
        """Produce standardized error responses without exposing tracebacks."""
        logger.warning(f"API Error [{status_code}] ({error_type}): {message}")
        return jsonify({
            'success': False,
            'error': error_type,
            'message': message
        }), status_code

    # =========================================================================
    # HEALTH CHECK
    # =========================================================================
    @app.route('/api/health', methods=['GET'])
    def health_check():
        active_id = data_loader_service.get_active_dataset_id()
        return api_response(
            data={
                'status': 'healthy',
                'service': 'DA-013 Environmental Analytics Flask Backend',
                'version': '1.0.0',
                'activeDatasetId': active_id
            },
            message='Flask backend service is online and operational.'
        )

    # =========================================================================
    # CSV UPLOAD API
    # =========================================================================
    @app.route('/api/upload', methods=['POST'])
    def upload_dataset():
        if 'file' not in request.files:
            return api_error("No file part provided in multipart/form-data request.", "MissingFileError", 400)

        file = request.files['file']
        if file.filename == '':
            return api_error("No file was selected for upload.", "EmptyFilenameError", 400)

        success, result, msg = data_loader_service.ingest_csv_file(file, file.filename)
        if not success:
            return api_error(msg, "InvalidCSVError", 400)

        return api_response(data=result, message=msg, status_code=201)

    # =========================================================================
    # DATASET METADATA API
    # =========================================================================
    @app.route('/api/dataset/info', methods=['GET'])
    @app.route('/api/dataset/<dataset_id>/info', methods=['GET'])
    def get_dataset_info(dataset_id=None):
        dataset = data_loader_service.get_dataset(dataset_id)
        if not dataset:
            return api_error("No active dataset loaded.", "NotFound", 404)
        return api_response(data=dataset['metadata'], message="Dataset metadata retrieved.")

    # =========================================================================
    # DATA PREVIEW API (Search, Sort, Pagination)
    # =========================================================================
    @app.route('/api/dataset/preview', methods=['GET'])
    @app.route('/api/dataset/<dataset_id>/preview', methods=['GET'])
    def get_dataset_preview(dataset_id=None):
        # Extract query parameters
        params = {
            'search': request.args.get('search', ''),
            'city': request.args.get('city', 'All'),
            'location': request.args.get('location', 'All'),
            'sortColumn': request.args.get('sortColumn', request.args.get('sort', 'id')),
            'sortDir': request.args.get('sortDir', request.args.get('dir', 'asc')),
            'page': request.args.get('page', 1),
            'limit': request.args.get('limit', 10)
        }

        # Check if dataset_id was supplied as query param
        req_id = dataset_id or request.args.get('dataset_id')
        records = data_loader_service.get_preview_records(req_id, params)
        return api_response(data=records, message="Preview records retrieved.")

    # =========================================================================
    # DATA QUALITY API
    # =========================================================================
    @app.route('/api/data-quality', methods=['GET'])
    @app.route('/api/dataset/<dataset_id>/quality', methods=['GET'])
    def get_data_quality(dataset_id=None):
        req_id = dataset_id or request.args.get('dataset_id')
        stats = data_cleaner_service.audit_quality(req_id)
        return api_response(data=stats, message="Data quality audit complete.")

    # =========================================================================
    # DATA CLEANING API
    # =========================================================================
    @app.route('/api/data-quality/clean', methods=['POST'])
    @app.route('/api/dataset/<dataset_id>/clean', methods=['POST'])
    def clean_dataset(dataset_id=None):
        req_id = dataset_id or request.args.get('dataset_id')
        options = request.get_json(silent=True) or {}
        result = data_cleaner_service.clean_dataset(req_id, options)

        if not result.get('success'):
            return api_error(result.get('message', 'Cleaning failed.'), "CleaningError", 400)

        return api_response(data=result, message="Dataset cleaning pipeline executed successfully.")

    # =========================================================================
    # POLLUTION ANALYSIS API
    # =========================================================================
    @app.route('/api/analysis/pollution', methods=['GET', 'POST'])
    @app.route('/api/dataset/<dataset_id>/analysis', methods=['GET', 'POST'])
    def analyze_pollution(dataset_id=None):
        req_id = dataset_id or request.args.get('dataset_id')

        # Combine JSON body and query parameters
        filters = {}
        if request.is_json and request.get_json(silent=True):
            filters.update(request.get_json())
        filters.update(request.args.to_dict())

        stats = analytics_service.calculate_analysis(req_id, filters)
        return api_response(data=stats, message="Pollution analysis metrics computed.")

    # =========================================================================
    # CHARTS DATA API
    # =========================================================================
    @app.route('/api/charts/data', methods=['GET', 'POST'])
    @app.route('/api/dataset/<dataset_id>/charts', methods=['GET', 'POST'])
    def get_chart_data(dataset_id=None):
        req_id = dataset_id or request.args.get('dataset_id')

        # Extract chart type
        chart_type = request.args.get('type')
        if not chart_type and request.is_json:
            chart_type = request.get_json().get('type')
        chart_type = chart_type or 'line'

        params = {}
        if request.is_json and request.get_json(silent=True):
            params.update(request.get_json())
        params.update(request.args.to_dict())

        try:
            data = chart_service.get_chart_data(req_id, chart_type, params)
            return api_response(data=data, message=f"{chart_type.capitalize()} chart data generated.")
        except ValueError as ve:
            return api_error(str(ve), "InvalidChartTypeError", 400)

    # =========================================================================
    # EXPORT CLEANED CSV API
    # =========================================================================
    @app.route('/api/export/csv', methods=['GET'])
    @app.route('/api/dataset/<dataset_id>/download', methods=['GET'])
    def download_cleaned_csv(dataset_id=None):
        req_id = dataset_id or request.args.get('dataset_id')
        dataset = data_loader_service.get_dataset(req_id)

        if not dataset:
            return api_error("Dataset not found.", "NotFound", 404)

        # If not yet cleaned, generate cleaned version with defaults
        if not dataset.get('is_cleaned') or not dataset.get('cleaned_filepath'):
            data_cleaner_service.clean_dataset(req_id, {'impute_method': 'median'})

        file_path = dataset.get('cleaned_filepath')
        if not file_path or not os.path.exists(file_path):
            # Fallback generate directly
            df = dataset.get('cleaned_df', dataset['df'])
            file_path = os.path.join(Config.OUTPUT_FOLDER, f"{dataset['dataset_id']}_cleaned.csv")
            df.to_csv(file_path, index=False)

        return send_file(
            file_path,
            as_attachment=True,
            download_name=f"cleaned_{dataset.get('filename', 'air_quality')}",
            mimetype='text/csv'
        )

    # =========================================================================
    # REPORTS API
    # =========================================================================
    @app.route('/api/export/report', methods=['GET'])
    @app.route('/api/dataset/<dataset_id>/report', methods=['GET'])
    def get_report(dataset_id=None):
        req_id = dataset_id or request.args.get('dataset_id')
        format_type = request.args.get('format', 'json').lower()

        if format_type in ['txt', 'download']:
            file_path = report_service.export_text_report(req_id)
            return send_file(
                file_path,
                as_attachment=True,
                download_name=f"report_{req_id or 'da013'}.txt",
                mimetype='text/plain'
            )

        report_data = report_service.generate_report(req_id)
        return api_response(data=report_data, message="Executive report compiled.")

    @app.route('/api/dataset/<dataset_id>/report/download', methods=['GET'])
    def download_report(dataset_id):
        file_path = report_service.export_text_report(dataset_id)
        return send_file(
            file_path,
            as_attachment=True,
            download_name=f"executive_report_{dataset_id}.txt",
            mimetype='text/plain'
        )

    # =========================================================================
    # SCIKIT-LEARN MACHINE LEARNING & ADVANCED STATISTICAL API
    # =========================================================================
    @app.route('/api/ml/outliers', methods=['GET', 'POST'])
    @app.route('/api/dataset/<dataset_id>/outliers', methods=['GET', 'POST'])
    def detect_dataset_outliers(dataset_id=None):
        """Detect multivariate outliers using Scikit-learn IsolationForest."""
        req_id = dataset_id or request.args.get('dataset_id')
        contamination = float(request.args.get('contamination', 0.05))
        if request.is_json and request.get_json(silent=True):
            contamination = float(request.get_json().get('contamination', contamination))

        result = ml_service.detect_outliers(req_id, contamination=contamination)
        return api_response(data=result, message="Scikit-learn Isolation Forest outlier detection complete.")

    @app.route('/api/ml/clusters', methods=['GET', 'POST'])
    @app.route('/api/dataset/<dataset_id>/clusters', methods=['GET', 'POST'])
    def cluster_monitoring_stations(dataset_id=None):
        """Group monitoring locations into risk clusters using Scikit-learn KMeans."""
        req_id = dataset_id or request.args.get('dataset_id')
        n_clusters = int(request.args.get('clusters', 3))
        if request.is_json and request.get_json(silent=True):
            n_clusters = int(request.get_json().get('clusters', n_clusters))

        result = ml_service.cluster_stations(req_id, n_clusters=n_clusters)
        return api_response(data=result, message="Scikit-learn KMeans station clustering complete.")

    @app.route('/api/ml/trend', methods=['GET', 'POST'])
    @app.route('/api/dataset/<dataset_id>/trend', methods=['GET', 'POST'])
    def forecast_pollution_trend(dataset_id=None):
        """Fit Linear Regression trajectory and compute projections using Scikit-learn."""
        req_id = dataset_id or request.args.get('dataset_id')
        pollutant = request.args.get('pollutant', 'pm25')
        forecast_days = int(request.args.get('days', 5))
        if request.is_json and request.get_json(silent=True):
            pollutant = request.get_json().get('pollutant', pollutant)
            forecast_days = int(request.get_json().get('days', forecast_days))

        result = ml_service.forecast_linear_trend(req_id, pollutant=pollutant, forecast_steps=forecast_days)
        return api_response(data=result, message="Scikit-learn linear trend projection computed.")

    @app.route('/api/analysis/persist', methods=['POST'])
    @app.route('/api/dataset/<dataset_id>/persist', methods=['POST'])
    def persist_analysis(dataset_id=None):
        """Persist comprehensive ML and descriptive statistical analysis to disk."""
        req_id = dataset_id or request.args.get('dataset_id')
        notes = "Automated Scikit-learn ML & Statistical Quality Audit"
        if request.is_json and request.get_json(silent=True):
            notes = request.get_json().get('notes', notes)

        result = ml_service.save_persistent_analysis(req_id, notes=notes)
        return api_response(data=result, message="Analysis successfully persisted to disk storage.")

    @app.route('/api/analysis/persistent', methods=['GET'])
    @app.route('/api/dataset/<dataset_id>/persistent', methods=['GET'])
    def get_persisted_analysis(dataset_id=None):
        """Retrieve stored persistent analysis records."""
        req_id = dataset_id or request.args.get('dataset_id')
        result = ml_service.get_persistent_analysis(req_id)
        return api_response(data=result.get('data', result), message="Persistent analysis retrieved.")

    # =========================================================================
    # CENTRALIZED ERROR HANDLERS
    # =========================================================================
    @app.errorhandler(400)
    def handle_bad_request(e):
        return api_error("Bad Request: Please check input formatting.", "BadRequest", 400)

    @app.errorhandler(404)
    def handle_not_found(e):
        return api_error("Resource not found. Verify endpoint URL.", "NotFound", 404)

    @app.errorhandler(413)
    def handle_large_file(e):
        return api_error("Uploaded file exceeds 16 MB limit.", "PayloadTooLarge", 413)

    @app.errorhandler(500)
    def handle_internal_error(e):
        logger.error(f"Internal server error: {e}", exc_info=True)
        return api_error("Internal server error. Processing could not be completed.", "InternalServerError", 500)

    @app.errorhandler(Exception)
    def handle_unexpected_exception(e):
        if isinstance(e, HTTPException):
            return api_error(e.description, type(e).__name__, e.code)
        logger.error(f"Unexpected exception: {e}", exc_info=True)
        return api_error("An unexpected error occurred during processing.", "UnexpectedException", 500)

    return app

if __name__ == '__main__':
    app = create_app()
    logger.info(f"Starting Flask server on http://{Config.HOST}:{Config.PORT}/api")
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)

