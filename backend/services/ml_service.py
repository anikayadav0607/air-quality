"""
Air Quality and Pollution Pattern Analysis (DA-013)
Machine Learning & Advanced Statistical Analysis Service (services/ml_service.py)

Powered by:
- Scikit-learn (IsolationForest, KMeans, LinearRegression, StandardScaler)
- Pandas (Tabular manipulation and feature matrices)
- NumPy (Vectorized distance metrics, centroids, and statistical operations)
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np

from sklearn.ensemble import IsolationForest
from sklearn.cluster import KMeans
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score

from config import Config
from services.data_loader import data_loader_service, POLLUTANT_COLUMNS

logger = logging.getLogger(__name__)

class MLAnalyticsService:
    """Provides Scikit-learn powered anomaly detection, clustering, regression and persistent analysis."""

    @staticmethod
    def _get_pollutant_matrix(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
        """Extract clean numeric matrix of available pollutant features."""
        features = [col for col in POLLUTANT_COLUMNS if col in df.columns]
        if not features:
            return pd.DataFrame(), []
        
        # Numeric conversion with median imputation for any temporary NaN in ML feature matrix
        matrix = df[features].apply(pd.to_numeric, errors='coerce')
        for col in features:
            if matrix[col].isna().any():
                matrix[col] = matrix[col].fillna(matrix[col].median())
        return matrix, features

    def detect_outliers(
        self,
        dataset_id: Optional[str] = None,
        contamination: float = 0.05,
        method: str = 'isolation_forest'
    ) -> Dict[str, Any]:
        """
        Detect multivariate sensor anomalies and outliers using Scikit-learn IsolationForest.
        Contamination: Expected proportion of outliers in the data (default: 0.05).
        """
        dataset = data_loader_service.get_dataset(dataset_id)
        if not dataset:
            return {'success': False, 'message': 'Dataset not found', 'outlierCount': 0, 'outliers': []}

        df = dataset['cleaned_df'] if dataset.get('is_cleaned') else dataset['df']
        if df.empty or len(df) < 2:
            return {
                'success': True,
                'method': 'Scikit-learn IsolationForest',
                'message': 'Insufficient records for ML anomaly modeling',
                'totalRows': len(df),
                'outlierCount': 0,
                'outlierPercentage': 0.0,
                'outliers': []
            }

        X, features = self._get_pollutant_matrix(df)
        if X.empty:
            return {
                'success': False,
                'method': 'Scikit-learn IsolationForest',
                'message': 'No pollutant features available for ML detection',
                'outliers': []
            }

        # Standardize features for numerical stability
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        # Fit Scikit-Learn IsolationForest
        iso = IsolationForest(
            n_estimators=100,
            contamination=max(0.01, min(0.25, contamination)),
            random_state=42
        )
        preds = iso.fit_predict(X_scaled)  # -1 for anomaly, 1 for inlier
        scores = iso.decision_function(X_scaled)  # Lower is more anomalous

        outlier_mask = (preds == -1)
        outlier_indices = np.where(outlier_mask)[0].tolist()
        outlier_count = len(outlier_indices)

        outlier_records = []
        for idx in outlier_indices:
            row = df.iloc[idx].to_dict()
            # Clean non-serializable objects
            clean_row = {}
            for k, v in row.items():
                if pd.isna(v):
                    clean_row[k] = None
                elif isinstance(v, (np.floating, float)):
                    clean_row[k] = round(float(v), 2)
                elif isinstance(v, (np.integer, int)):
                    clean_row[k] = int(v)
                else:
                    clean_row[k] = str(v)
            clean_row['anomalyScore'] = round(float(scores[idx]), 4)
            clean_row['rowIndex'] = idx
            outlier_records.append(clean_row)

        # Sort by most severe anomaly score first
        outlier_records.sort(key=lambda x: x['anomalyScore'])

        return {
            'success': True,
            'method': 'Scikit-learn IsolationForest',
            'featuresAnalyzed': features,
            'contaminationRate': contamination,
            'totalRowsScanned': len(df),
            'outlierCount': outlier_count,
            'outlierPercentage': round((outlier_count / len(df)) * 100, 2),
            'outliers': outlier_records[:50]  # top 50 anomalies for inspection
        }

    def filter_outliers_dataframe(
        self,
        df: pd.DataFrame,
        contamination: float = 0.05
    ) -> Tuple[pd.DataFrame, int, List[int]]:
        """Filter out rows flagged as anomalies by Scikit-learn Isolation Forest."""
        if len(df) < 5:
            return df, 0, []

        X, _ = self._get_pollutant_matrix(df)
        if X.empty:
            return df, 0, []

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        iso = IsolationForest(
            n_estimators=100,
            contamination=max(0.01, min(0.20, contamination)),
            random_state=42
        )
        preds = iso.fit_predict(X_scaled)
        inlier_mask = (preds == 1)
        removed_count = int((preds == -1).sum())
        removed_indices = np.where(preds == -1)[0].tolist()

        filtered_df = df[inlier_mask].reset_index(drop=True)
        return filtered_df, removed_count, removed_indices

    def cluster_stations(
        self,
        dataset_id: Optional[str] = None,
        n_clusters: int = 3
    ) -> Dict[str, Any]:
        """
        Cluster monitoring stations into Environmental Risk Categories using Scikit-learn KMeans.
        """
        dataset = data_loader_service.get_dataset(dataset_id)
        if not dataset:
            return {'success': False, 'message': 'Dataset not found', 'clusters': []}

        df = dataset['cleaned_df'] if dataset.get('is_cleaned') else dataset['df']
        if df.empty or 'location' not in df.columns:
            return {'success': False, 'message': 'Location data not available for station clustering'}

        # Calculate mean pollutant levels per monitoring station
        features = [col for col in POLLUTANT_COLUMNS if col in df.columns]
        if not features:
            return {'success': False, 'message': 'No pollutant metrics found'}

        station_group = df.groupby('location')[features].mean().dropna()
        if len(station_group) < 2:
            return {'success': False, 'message': 'Need at least 2 stations for KMeans clustering'}

        k = min(n_clusters, len(station_group))
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(station_group)

        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(X_scaled)

        # Name clusters by average particulate severity
        cluster_severity = {}
        for c in range(k):
            members = station_group[labels == c]
            metric = members['pm25'].mean() if 'pm25' in members.columns else members.iloc[:, 0].mean()
            cluster_severity[c] = float(metric)

        sorted_clusters = sorted(cluster_severity.items(), key=lambda x: x[1])
        tier_names = ["Low Exposure / Baseline", "Moderate Urban Blend", "High Pollution Hotspot"]

        cluster_mapping = {}
        for rank, (cluster_idx, _) in enumerate(sorted_clusters):
            cluster_mapping[cluster_idx] = tier_names[min(rank, len(tier_names) - 1)]

        station_results = []
        for loc_idx, (loc_name, row) in enumerate(station_group.iterrows()):
            c_label = labels[loc_idx]
            station_results.append({
                'location': str(loc_name),
                'clusterId': int(c_label),
                'riskProfile': cluster_mapping[c_label],
                'meanMetrics': {col: round(float(row[col]), 2) for col in features}
            })

        return {
            'success': True,
            'algorithm': 'Scikit-learn KMeans',
            'nClusters': k,
            'features': features,
            'stations': station_results
        }

    def forecast_linear_trend(
        self,
        dataset_id: Optional[str] = None,
        pollutant: str = 'pm25',
        forecast_steps: int = 5
    ) -> Dict[str, Any]:
        """
        Estimate historical trajectory and project future steps using Scikit-learn Linear Regression.
        """
        dataset = data_loader_service.get_dataset(dataset_id)
        if not dataset:
            return {'success': False, 'message': 'Dataset not found'}

        df = dataset['cleaned_df'] if dataset.get('is_cleaned') else dataset['df']
        clean_poll = pollutant.lower().replace('.', '').replace('_', '')
        if clean_poll not in df.columns or 'date' not in df.columns:
            return {'success': False, 'message': f'Feature {pollutant} or date not present'}

        # Aggregate daily means
        daily = df.groupby('date')[clean_poll].mean().dropna().reset_index()
        if len(daily) < 3:
            return {'success': False, 'message': 'Need at least 3 temporal points for regression'}

        daily['day_num'] = np.arange(len(daily))
        X = daily[['day_num']].values
        y = daily[clean_poll].values

        reg = LinearRegression()
        reg.fit(X, y)
        y_pred = reg.predict(X)
        r2 = float(r2_score(y, y_pred))
        slope = float(reg.coef_[0])

        # Forecast future points
        future_days = np.arange(len(daily), len(daily) + forecast_steps).reshape(-1, 1)
        future_pred = reg.predict(future_days)

        trend_direction = "Rising / Deteriorating" if slope > 0.05 else ("Decreasing / Improving" if slope < -0.05 else "Stable")

        return {
            'success': True,
            'algorithm': 'Scikit-learn LinearRegression',
            'pollutant': clean_poll,
            'historicalDays': len(daily),
            'slopePerDay': round(slope, 3),
            'r2Score': round(r2, 3),
            'trendDirection': trend_direction,
            'historical': [
                {'date': str(row['date']), 'observed': round(float(row[clean_poll]), 2), 'fitted': round(float(y_pred[i]), 2)}
                for i, row in daily.iterrows()
            ],
            'forecast': [
                {'dayOffset': int(i + 1), 'projectedValue': max(0.0, round(float(val), 2))}
                for i, val in enumerate(future_pred)
            ]
        }

    def save_persistent_analysis(
        self,
        dataset_id: Optional[str] = None,
        notes: str = "Automated Scikit-learn ML & Statistical Quality Audit"
    ) -> Dict[str, Any]:
        """
        Calculate complete descriptive + ML analysis and persist state to outputs disk storage.
        """
        dataset = data_loader_service.get_dataset(dataset_id)
        if not dataset:
            return {'success': False, 'message': 'Dataset not found'}

        target_id = dataset['dataset_id']
        outliers_info = self.detect_outliers(target_id, contamination=0.05)
        clusters_info = self.cluster_stations(target_id)
        trend_info = self.forecast_linear_trend(target_id, pollutant='pm25')

        payload = {
            'datasetId': target_id,
            'filename': dataset.get('filename', 'dataset.csv'),
            'totalRecords': len(dataset.get('cleaned_df', dataset['df'])),
            'timestamp': pd.Timestamp.now().isoformat(),
            'notes': notes,
            'scikitLearnML': {
                'outlierDetection': {
                    'method': outliers_info.get('method'),
                    'outlierCount': outliers_info.get('outlierCount', 0),
                    'outlierPercentage': outliers_info.get('outlierPercentage', 0.0)
                },
                'stationClustering': clusters_info,
                'trendModel': {
                    'pollutant': trend_info.get('pollutant'),
                    'slopePerDay': trend_info.get('slopePerDay'),
                    'r2Score': trend_info.get('r2Score'),
                    'trendDirection': trend_info.get('trendDirection')
                }
            }
        }

        # Save to outputs directory for persistence
        out_file = os.path.join(Config.OUTPUT_FOLDER, f"{target_id}_persistent_analysis.json")
        with open(out_file, 'w', encoding='utf-8') as f:
            json.dump(payload, f, indent=2)

        dataset['persistent_analysis'] = payload
        dataset['persistent_analysis_path'] = out_file
        logger.info(f"Saved persistent Scikit-learn analysis to {out_file}")

        return {
            'success': True,
            'datasetId': target_id,
            'persistentFilePath': out_file,
            'analysis': payload
        }

    def get_persistent_analysis(self, dataset_id: Optional[str] = None) -> Dict[str, Any]:
        """Retrieve stored persistent analysis from disk or memory."""
        dataset = data_loader_service.get_dataset(dataset_id)
        target_id = dataset['dataset_id'] if dataset else (dataset_id or data_loader_service.get_active_dataset_id())
        
        if not target_id:
            return {'success': False, 'message': 'No dataset ID specified'}

        out_file = os.path.join(Config.OUTPUT_FOLDER, f"{target_id}_persistent_analysis.json")
        if os.path.exists(out_file):
            with open(out_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return {'success': True, 'data': data, 'source': 'disk'}

        if dataset and 'persistent_analysis' in dataset:
            return {'success': True, 'data': dataset['persistent_analysis'], 'source': 'memory'}

        # Auto-compute and persist if not found
        return self.save_persistent_analysis(target_id)

# Singleton ML Analytics Service
ml_service = MLAnalyticsService()
