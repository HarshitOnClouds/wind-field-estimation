# Wind Field Estimation using Sentinel-1 SAR and ERA5

A geospatial machine learning system for estimating regional wind conditions from Sentinel-1 SAR imagery using Google Earth Engine, FastAPI, and React.

---

## Overview

This project combines:

* Remote sensing
* Atmospheric data
* Machine learning
* Geospatial visualization
* Web-based interaction

to build an interactive platform where users can:

1. Select an Area of Interest (AOI)
2. Choose a date
3. Generate atmospheric wind visualizations
4. Estimate regional wind speed using ML

The system uses:

* Sentinel-1 SAR imagery for ocean surface roughness
* ERA5 atmospheric reanalysis data for wind reference
* Random Forest regression for wind estimation
* Cartopy + Matplotlib for scientific visualization

---

# Features

## Geospatial Processing

* Sentinel-1 SAR retrieval from Google Earth Engine
* ERA5 wind field retrieval
* AOI-based geospatial querying
* Ocean masking
* Wind field interpolation

## Machine Learning

* SAR statistical feature extraction
* Random Forest regression model
* Regional wind speed estimation
* Feature engineering pipeline

## Visualization

* Atmospheric wind heatmaps
* Streamline rendering
* Ocean-only wind visualization
* Wind magnitude color scaling
* Interactive frontend visualization

## Full Stack Application

* FastAPI backend
* React + Leaflet frontend
* Dynamic AOI selection
* Generated visualization rendering
* API-based inference pipeline

---

# Tech Stack

## Backend

* Python
* FastAPI
* Google Earth Engine
* NumPy
* Pandas
* Scikit-learn
* Matplotlib
* Cartopy
* SciPy

## Frontend

* React
* JavaScript
* Leaflet
* React-Leaflet

## Data Sources

* Sentinel-1 SAR
* ERA5 Atmospheric Reanalysis

---

# System Architecture

```text
User AOI + Date
       ↓
Frontend Request
       ↓
FastAPI Backend
       ↓
Google Earth Engine
       ↓
Sentinel-1 SAR Retrieval
       ↓
Feature Extraction
       ↓
Random Forest Prediction
       ↓
ERA5 Wind Retrieval
       ↓
Atmospheric Visualization Generation
       ↓
Frontend Rendering
```

---

# Machine Learning Workflow

## Input Features

Extracted SAR statistics:

* Mean backscatter
* Standard deviation
* Percentiles
* Gradient statistics
* Roughness metrics

## Target Variable

Regional average wind speed derived from ERA5.

## Model

Random Forest Regressor.

## Current Output

The ML model predicts:

* Regional average wind speed for the selected AOI.

The atmospheric map visualization itself is generated using ERA5 reference wind fields.

---

# Visualization Pipeline

The generated atmospheric visualization includes:

* Ocean-masked wind fields
* Wind magnitude heatmaps
* Streamline-based wind flow
* Geographic coastlines and borders
* Interpolated atmospheric fields

---

# Project Structure

```text
wind-field-estimation/
│
├── frontend/                 # React frontend
├── src/
│   ├── api/                  # FastAPI backend
│   ├── data/                 # Data processing
│   ├── models/               # ML models
│   └── utils/
│
├── notebooks/                # Experimentation notebooks
├── generated/                # Generated atmospheric maps
├── models/                   # Saved ML models
├── requirements.txt
└── README.md
```

---

# Setup

## Clone Repository

```bash
git clone <repo-url>
cd wind-field-estimation
```

---

# Backend Setup

## Create Virtual Environment

```bash
python -m venv venv
```

## Activate Environment

### Windows

```bash
venv\Scripts\activate
```

### Linux / Mac

```bash
source venv/bin/activate
```

---

# Install Dependencies

```bash
pip install -r requirements.txt
```

---

# Google Earth Engine Authentication

```python
import ee
ee.Authenticate()
ee.Initialize(project='your-project-id')

```
in terminal enter 
```text
    earthengine authenticate


```

---

# Run Backend

```bash
uvicorn src.api.app:app --reload
```

Backend runs at:

```text
http://127.0.0.1:60600
```

---

# Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:3000
```

---

# Usage

1. Open frontend
2. Draw/select AOI
3. Choose date
4. Submit request
5. Backend generates:

   * Wind estimation
   * Atmospheric visualization
6. Frontend displays generated results

---

# Example Output

Generated visualization contains:

* Wind streamlines
* Wind magnitude heatmap
* Ocean masking
* Geographic atmospheric rendering

---

# Current Limitations

## Important Scientific Limitation

The ML model currently predicts:

* Regional average wind speed

It does NOT currently predict:

* Dense pixel-wise wind fields

The atmospheric wind visualization shown in the application is generated using ERA5 reference wind data, not direct ML prediction.

---

# Future Improvements

## Planned Enhancements

* Temporal wind animation
* CNN/ResNet-based SAR feature learning
* SAR-based wind direction estimation
* Dense local wind prediction
* Forecasting models
* Better atmospheric interpolation
* Cloud deployment
* Real-time processing pipeline

---

# Screenshots

to be added of 

* Homepage
* AOI selection
* Generated atmospheric map
* Wind visualization
* Prediction results

---

# Demo Video

to be added

---

# Learning Outcomes

This project involved:

* Remote sensing workflows
* Geospatial data engineering
* Scientific visualization
* Atmospheric data processing
* Machine learning pipelines
* Full-stack integration
* Google Earth Engine workflows

---

# Acknowledgements

* Google Earth Engine
* ECMWF ERA5
* ESA Sentinel-1
* Cartopy
* Scikit-learn
* React Leaflet

---

# License

MIT License
