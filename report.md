# Wind Field Estimation using Sentinel-1 SAR Imagery and Machine Learning

## 1. Introduction

Accurate estimation of ocean surface wind fields is important for weather forecasting, marine navigation, offshore operations, and climate monitoring. Traditional wind measurements from buoys and weather stations are spatially limited. Satellite-based remote sensing provides large-scale ocean observations.

This project focuses on estimating wind-related information from Sentinel-1 Synthetic Aperture Radar (SAR) imagery using geospatial processing and machine learning techniques. Sentinel-1 SAR captures microwave backscatter from the ocean surface, which varies with surface roughness and wind conditions.

The project integrates:

* Sentinel-1 SAR imagery
* ERA5 meteorological data
* Feature engineering
* Machine learning regression
* FastAPI-based inference system

to build an automated wind estimation workflow.

---

## 2. Objectives

The objectives of this project are:

* Retrieve Sentinel-1 SAR imagery for selected coastal regions
* Preprocess SAR imagery and extract statistical features
* Integrate ERA5 reference wind data
* Train machine learning models for wind speed estimation
* Build an API for automated geospatial inference

---

## 3. Dataset Description

### Sentinel-1 SAR Data

* Source: Google Earth Engine
* Dataset: COPERNICUS/S1_GRD
* Polarization: VV
* Instrument Mode: IW

### ERA5 Wind Data

* Source: ECMWF ERA5 LAND HOURLY
* Variables Used:

  * u_component_of_wind_10m
  * v_component_of_wind_10m

Wind speed was computed using:


sqrt{u^2 + v^2}


---

## 4. Methodology

### 4.1 SAR Data Retrieval

Sentinel-1 SAR imagery was retrieved from Google Earth Engine for selected Areas of Interest (AOIs) and temporal windows.

### 4.2 Preprocessing

The preprocessing pipeline included:

* AOI clipping
* Gaussian smoothing
* Noise reduction
* Raster processing using rasterio and NumPy

### 4.3 Feature Engineering

The following SAR features were extracted:

* Mean backscatter
* Standard deviation
* Percentiles (25, 50, 75)
* Gradient statistics
* Roughness statistics
* Edge density

### 4.4 Wind Data Integration

ERA5 wind datasets were used as reference labels for supervised learning.

### 4.5 Machine Learning

Two regression models were evaluated:

* Linear Regression
* Random Forest Regression

The Random Forest model produced better prediction performance.

### 4.6 API Development

A FastAPI backend was developed to:

* Accept AOI and date inputs
* Retrieve SAR imagery automatically
* Extract features
* Predict wind speed
* Return estimated wind information

---

## 5. Results

### Model Performance

* Linear Regression MAE: ~1.22 m/s
* Random Forest MAE: ~1.14 m/s

Random Forest regression showed improved performance due to its ability to model nonlinear relationships.

### Observations

* SAR mean backscatter showed moderate relationship with wind speed
* Simple statistical features alone were insufficient for perfect prediction
* Nonlinear models improved robustness

---

## 6. Challenges

Several challenges were encountered:

* Sparse Sentinel-1 temporal availability
* SAR speckle noise
* Limited dataset size
* Weak direct correlation between simple SAR statistics and wind speed
* Computational limitations during raster export

---

## 7. Future Improvements

Future work may include:

* Larger multi-region datasets
* CNN-based feature extraction
* Spatial patch-based learning
* Interactive frontend map interface
* Real-time geospatial visualization
* Improved wind vector estimation
* Advanced geophysical SAR models

---

## 8. Conclusion

This project successfully demonstrated an end-to-end geospatial machine learning workflow for wind estimation using Sentinel-1 SAR imagery.

The system integrates:

* Remote sensing
* Geospatial preprocessing
* Meteorological datasets
* Machine learning
* API deployment

to provide automated wind estimation capabilities from satellite data.
