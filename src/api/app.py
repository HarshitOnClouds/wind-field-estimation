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
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import pandas as pd
import joblib
import ee

import matplotlib.pyplot as plt
import numpy as np
import uuid
import os


# Initialize Earth Engine
ee.Initialize(project='wind-field-estimation-497821')

# Create app
app = FastAPI()

app.mount(
    "/generated",
    StaticFiles(directory="generated"),
    name="generated"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

        # ERA5 wind field
        era5 = (
            ee.ImageCollection('ECMWF/ERA5/HOURLY')
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

        # Sample dense grid
        samples = era5.sample(
            region=aoi,
            scale=10000,
            geometries=True,
            numPixels=200
        ).getInfo()

        lats = []
        lons = []
        u_vals = []
        v_vals = []

        for feature in samples['features']:
        
            coords = feature['geometry']['coordinates']
            props = feature['properties']

            lon = coords[0]
            lat = coords[1]

            u = props.get('u_component_of_wind_10m')
            v = props.get('v_component_of_wind_10m')

            if u is None or v is None:
                continue
            
            lons.append(lon)
            lats.append(lat)
            u_vals.append(u)
            v_vals.append(v)

        # Generate figure
        #plt.figure(figsize=(8, 8))

        # plt.style.use('dark_background')

        import cartopy.crs as ccrs
        import cartopy.feature as cfeature

        # Create map figure
        fig = plt.figure(figsize=(10, 10))

        ax = plt.axes(
            projection=ccrs.PlateCarree()
        )

        # Set AOI extent
        ax.set_extent([
            request.min_lon,
            request.max_lon,
            request.min_lat,
            request.max_lat
        ])

        # Add map features
        ax.add_feature(
            cfeature.LAND,
            facecolor='#1e1e1e'
        )

        ax.add_feature(
            cfeature.OCEAN,
            facecolor='#0b1f33'
        )

        ax.add_feature(
            cfeature.COASTLINE,
            edgecolor='white',
            linewidth=0.8
        )

        ax.add_feature(
            cfeature.BORDERS,
            edgecolor='gray',
            linewidth=0.3
        )

        # Wind magnitude
        magnitude = np.sqrt(
            np.array(u_vals)**2 +
            np.array(v_vals)**2
        )

        # Quiver plot
        quiver = ax.quiver(
            lons,
            lats,
            u_vals,
            v_vals,
            magnitude,
            cmap='cool',
            transform=ccrs.PlateCarree(),
            scale=120
        )

        # Colorbar
        plt.colorbar(
            quiver,
            label='Wind Speed Magnitude'
        )

        # Title
        plt.title(
            f'ERA5 Wind Field\n{request.date}',
            fontsize=14
        )

        # Gridlines
        gl = ax.gridlines(
            draw_labels=True,
            alpha=0.2
        )

        gl.top_labels = False
        gl.right_labels = False

        plt.quiver(
            lons,
            lats,
            u_vals,
            v_vals,
            np.sqrt(np.array(u_vals)**2 + np.array(v_vals)**2),
            cmap='cool'
        )

        plt.title(
            f'Wind Field - {request.date}'
        )

        plt.xlabel('Longitude')
        plt.ylabel('Latitude')

        plt.grid(alpha=0.2)

        # Save image
        filename = f"{uuid.uuid4()}.png"

        filepath = os.path.join(
            'generated',
            filename
        )

        plt.savefig(
            filepath,
            bbox_inches='tight',
            dpi=200
        )

        plt.close()

        
        return {
            "predicted_wind_speed_mps": round(
                float(prediction),
                3
            ),
            "sar_features": input_data.to_dict(
                orient='records'
            )[0],
            "generated_image": filename
        }
        

    except Exception as e:

        return {
            "error": str(e)
        }
