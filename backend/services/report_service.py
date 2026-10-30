"""
Air Quality and Pollution Pattern Analysis (DA-013)
Report Generation Service Module (services/report_service.py)

Compiles executive environmental findings, data quality audits,
statistical aggregations, and exportable reports.
"""

import os
import logging
from typing import Dict, Any, Optional
import pandas as pd
from datetime import datetime
from config import Config
from services.data_loader import data_loader_service, POLLUTANT_COLUMNS
from services.data_cleaner import data_cleaner_service
from services.analytics import analytics_service

logger = logging.getLogger(__name__)

class ReportService:
    """Generates structured analytics reports and export files."""

    @staticmethod
    def generate_report(dataset_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Produce a comprehensive analytics report data structure.
        """
        dataset = data_loader_service.get_dataset(dataset_id)
        if not dataset:
            return {
                'success': False,
                'message': 'No dataset available to generate report.'
            }

        target_id = dataset['dataset_id']
        meta = dataset['metadata']
        quality = data_cleaner_service.audit_quality(target_id)
        analysis_pm25 = analytics_service.calculate_analysis(target_id, {'pollutant': 'pm25'})
        analysis_pm10 = analytics_service.calculate_analysis(target_id, {'pollutant': 'pm10'})

        # Key Observations
        observations = []
        if analysis_pm25['count'] > 0:
            observations.append(
                f"Peak PM2.5 of {analysis_pm25['max']} µg/m³ was recorded at {analysis_pm25['maxLocation']} on {analysis_pm25['maxDate']}."
            )
        if analysis_pm10['count'] > 0:
            observations.append(
                f"Average PM10 concentration across all stations is {analysis_pm10['average']} µg/m³."
            )

        if quality['metrics']['missingValues'] > 0:
            observations.append(
                f"Dataset contains {quality['metrics']['missingValues']} missing sensor values ({quality['metrics']['missingPercentage']}%) requiring imputation."
            )
        else:
            observations.append("Dataset is complete with 0 missing pollutant measurements.")

        # Cleaning summary
        cleaning_info = dataset.get('cleaning_log')
        if not cleaning_info:
            cleaning_summary = "Pre-cleaning baseline data. No cleaning transformations applied yet."
        else:
            cleaning_summary = f"Dataset cleaned: {', '.join(cleaning_info.get('actionsTaken', []))}"

        report_data = {
            'projectTitle': 'Air Quality and Pollution Pattern Analysis',
            'projectCode': 'DA-013',
            'domain': 'Environmental Analytics',
            'generatedAt': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'datasetSummary': {
                'datasetId': target_id,
                'filename': meta.get('filename', 'Unknown'),
                'totalRecords': meta.get('totalRecords', 0),
                'locationsCount': meta.get('locationsCount', 0),
                'locations': meta.get('locations', []),
                'dateRange': meta.get('dateRange', {}),
                'completenessRate': meta.get('completenessRate', '0%')
            },
            'dataQualitySummary': quality['metrics'],
            'cleaningSummary': cleaning_summary,
            'statisticalHighlights': {
                'pm25': {
                    'mean': analysis_pm25['average'],
                    'max': analysis_pm25['max'],
                    'maxLocation': analysis_pm25['maxLocation'],
                    'maxDate': analysis_pm25['maxDate'],
                    'min': analysis_pm25['min'],
                    'unit': 'µg/m³'
                },
                'pm10': {
                    'mean': analysis_pm10['average'],
                    'max': analysis_pm10['max'],
                    'maxLocation': analysis_pm10['maxLocation'],
                    'maxDate': analysis_pm10['maxDate'],
                    'min': analysis_pm10['min'],
                    'unit': 'µg/m³'
                }
            },
            'stationBreakdown': analysis_pm25.get('stationAverages', []),
            'keyObservations': observations,
            'limitations': [
                "Missing measurements are reported as NaN and not imputed as zero.",
                "Comparisons between particulate mass (µg/m³) and gaseous fractions (ppb) require molar conversions.",
                "Atmospheric microclimates and sensor elevations may produce localized variance."
            ],
            'disclaimer': Config.DISCLAIMER
        }

        return report_data

    @staticmethod
    def export_text_report(dataset_id: Optional[str] = None) -> str:
        """
        Generate and persist a text report file.
        Returns the absolute path to the generated file.
        """
        report = ReportService.generate_report(dataset_id)
        target_id = dataset_id or data_loader_service.get_active_dataset_id() or "unknown"
        out_path = os.path.join(Config.OUTPUT_FOLDER, f"{target_id}_executive_report.txt")

        lines = [
            "=" * 78,
            "AIR QUALITY AND POLLUTION PATTERN ANALYSIS (DA-013)",
            "Executive Environmental Analytics Report",
            "=" * 78,
            f"Generated: {report.get('generatedAt', '')}",
            f"Dataset ID: {target_id}",
            f"Source File: {report['datasetSummary']['filename']}",
            "",
            "1. DATASET SCOPE & METADATA",
            "-" * 78,
            f"Total Records:       {report['datasetSummary']['totalRecords']:,}",
            f"Monitoring Stations: {report['datasetSummary']['locationsCount']} active nodes",
            f"Stations:            {', '.join(report['datasetSummary']['locations'])}",
            f"Date Coverage:       {report['datasetSummary']['dateRange'].get('start', 'N/A')} to {report['datasetSummary']['dateRange'].get('end', 'N/A')}",
            f"Completeness Rate:   {report['datasetSummary']['completenessRate']}",
            "",
            "2. DATA QUALITY AUDIT",
            "-" * 78,
            f"Health Score:        {report['dataQualitySummary']['healthScore']}%",
            f"Missing Values:      {report['dataQualitySummary']['missingValues']} ({report['dataQualitySummary']['missingPercentage']}%)",
            f"Duplicate Records:   {report['dataQualitySummary']['duplicateRecords']}",
            f"Invalid Numerics:    {report['dataQualitySummary']['invalidNumeric']}",
            f"Invalid Dates:       {report['dataQualitySummary']['invalidDates']}",
            f"Verified Zeros:      {report['dataQualitySummary'].get('recordedZeros', 0)} (preserved)",
            "",
            "3. CLEANING STATUS",
            "-" * 78,
            report['cleaningSummary'],
            "",
            "4. DESCRIPTIVE STATISTICAL HIGHLIGHTS",
            "-" * 78,
            f"PM2.5 Mean Level:    {report['statisticalHighlights']['pm25']['mean']} µg/m³",
            f"PM2.5 Peak:          {report['statisticalHighlights']['pm25']['max']} µg/m³ ({report['statisticalHighlights']['pm25']['maxLocation']} on {report['statisticalHighlights']['pm25']['maxDate']})",
            f"PM10 Mean Level:     {report['statisticalHighlights']['pm10']['mean']} µg/m³",
            f"PM10 Peak:           {report['statisticalHighlights']['pm10']['max']} µg/m³ ({report['statisticalHighlights']['pm10']['maxLocation']})",
            "",
            "5. KEY ENVIRONMENTAL OBSERVATIONS",
            "-" * 78
        ]

        for idx, obs in enumerate(report['keyObservations'], 1):
            lines.append(f"{idx}. {obs}")

        lines.extend([
            "",
            "6. LIMITATIONS & DISCLAIMER",
            "-" * 78
        ])
        for idx, lim in enumerate(report['limitations'], 1):
            lines.append(f"• {lim}")

        lines.extend([
            "",
            Config.DISCLAIMER,
            "=" * 78
        ])

        with open(out_path, 'w', encoding='utf-8') as f:
            f.write("\n".join(lines))

        return out_path

# Global singleton report service
report_service = ReportService()

