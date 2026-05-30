# from fastapi import FastAPI
# from pydantic import BaseModel
# import pandas as pd
# import joblib

# # Create FastAPI app
# app = FastAPI()

# # Load trained model
# model = joblib.load(
#     'models/random_forest_model.pkl'
# )

# # Input schema
# class WindFeatures(BaseModel):
#     sar_mean: float
#     sar_std: float
#     sar_p25: float
#     sar_p50: float
#     sar_p75: float

# # Home route
# @app.get("/")
# def home():
#     return {
#         "message": "Wind Estimation API Running"
#     }

# # Prediction route
# @app.post("/predict")
# def predict(features: WindFeatures):

#     input_data = pd.DataFrame([{
#         'sar_mean': features.sar_mean,
#         'sar_std': features.sar_std,
#         'sar_p25': features.sar_p25,
#         'sar_p50': features.sar_p50,
#         'sar_p75': features.sar_p75
#     }])

#     prediction = model.predict(input_data)[0]

#     return {
#         "predicted_wind_speed": round(
#             float(prediction),
#             3
#         )
#     }
# this was basic api testing, now we build real submission stuff

from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib
import ee

# Initialize Earth Engine
ee.Initialize(project='wind-field-estimation-497821')

# Create app
app = FastAPI()

# Load trained model
model = joblib.load(
    'models/random_forest_model.pkl'
)

# Input schema
class AOIRequest(BaseModel):
    min_lon: float
    min_lat: float
    max_lon: float
    max_lat: float
    date: str

@app.get("/")
def home():
    return {
        "message": "Wind Estimation API Running"
    }

@app.post("/predict")
def predict(request: AOIRequest):

    try:

        # Define AOI
        aoi = ee.Geometry.Rectangle([
            request.min_lon,
            request.min_lat,
            request.max_lon,
            request.max_lat
        ])

        # SAR collection
        sar_collection = (
            ee.ImageCollection('COPERNICUS/S1_GRD')
            .filterBounds(aoi)
            .filterDate(
                request.date,
                ee.Date(request.date).advance(5, 'day')
            )
            .filter(
                ee.Filter.eq(
                    'instrumentMode',
                    'IW'
                )
            )
            .filter(
                ee.Filter.listContains(
                    'transmitterReceiverPolarisation',
                    'VV'
                )
            )
            .select('VV')
        )

        count = sar_collection.size().getInfo()

        if count == 0:
            return {
                "error": "No SAR imagery found"
            }

        # Average SAR image
        sar = sar_collection.mean()

        # Extract statistics
        sar_stats = sar.reduceRegion(
            reducer=(
                ee.Reducer.mean()
                .combine(
                    reducer2=ee.Reducer.stdDev(),
                    sharedInputs=True
                )
                .combine(
                    reducer2=ee.Reducer.percentile(
                        [25, 50, 75]
                    ),
                    sharedInputs=True
                )
            ),
            geometry=aoi,
            scale=100,
            maxPixels=1e9
        ).getInfo()

        # Prepare features
        input_data = pd.DataFrame([{
            'sar_mean': sar_stats.get('VV_mean'),
            'sar_std': sar_stats.get('VV_stdDev'),
            'sar_p25': sar_stats.get('VV_p25'),
            'sar_p50': sar_stats.get('VV_p50'),
            'sar_p75': sar_stats.get('VV_p75')
        }])

        # Predict
        prediction = model.predict(
            input_data
        )[0]

        # ERA5 wind data
        era5 = (
            ee.ImageCollection('ECMWF/ERA5_LAND/HOURLY')
            .filterBounds(aoi)
            .filterDate(
                request.date,
                ee.Date(request.date).advance(5, 'day')
            )
            .select([
                'u_component_of_wind_10m',
                'v_component_of_wind_10m'
            ])
            .mean()
        )

        # Sample vectors
        samples = era5.sample(
            region=aoi,
            scale=20000,
            geometries=True,
            numPixels=10
        ).getInfo()

        wind_vectors = []

        for feature in samples['features']:
        
            coords = feature['geometry']['coordinates']
            props = feature['properties']

            wind_vectors.append({
                "lon": coords[0],
                "lat": coords[1],
                "u": props.get(
                    'u_component_of_wind_10m'
                ),
                "v": props.get(
                    'v_component_of_wind_10m'
                )
            })

        return {
            "predicted_wind_speed_mps": round(
                float(prediction),
                3
            ),
            "sar_features": input_data.to_dict(
                orient='records'
            )[0],
            "wind_vectors": wind_vectors
        }

    except Exception as e:

        return {
            "error": str(e)
        }
