import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import Normalize
from matplotlib.cm import ScalarMappable

import numpy as np
import uuid
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import pandas as pd
import joblib
import ee
import requests
from PIL import Image
from io import BytesIO
from scipy.interpolate import griddata
import cartopy.crs as ccrs
import cartopy.feature as cfeature
import traceback


# Initialize Earth Engine
ee.Initialize(project='wind-field-estimation-497821')

# Create app
app = FastAPI()
os.makedirs('generated', exist_ok=True)

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

        # SAR visualization image
        sar_thumb = sar.visualize(
            min=-20,
            max=-14,
            palette=['000000', 'ffffff']
        )

        thumb_url = sar_thumb.getThumbURL({
            'region': aoi,
            'dimensions': 1024
        })

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
        sar_values = {
            'sar_mean': sar_stats.get('VV_mean'),
            'sar_std': sar_stats.get('VV_stdDev'),
            'sar_p25': sar_stats.get('VV_p25'),
            'sar_p50': sar_stats.get('VV_p50'),
            'sar_p75': sar_stats.get('VV_p75')
        }

        if any(v is None for v in sar_values.values()):
            return {"error": f"Missing SAR features: {sar_values}"}

        input_data = pd.DataFrame([sar_values])

        # Predict
        prediction = model.predict(input_data)[0]

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

        # Create structured grid
        num_points = 6

        lon_values = np.linspace(
            request.min_lon,
            request.max_lon,
            num_points
        )

        lat_values = np.linspace(
            request.min_lat,
            request.max_lat,
            num_points
        )

        u_grid = np.zeros((num_points, num_points))
        v_grid = np.zeros((num_points, num_points))

        print("Generating structured wind grid...")

        # Build all points in one FeatureCollection
        points = ee.FeatureCollection([
            ee.Feature(ee.Geometry.Point([lon, lat]), {'i': i, 'j': j})
            for i, lat in enumerate(lat_values)
            for j, lon in enumerate(lon_values)
        ])

        # Single GEE call instead of 36
        sampled = era5.reduceRegions(
            collection=points,
            reducer=ee.Reducer.mean(),
            scale=10000
        ).getInfo()

        lats = []
        lons = []
        u_vals = []
        v_vals = []

        for feat in sampled['features']:
            props = feat['properties']
            coords = feat['geometry']['coordinates']
            i = int(props['i'])
            j = int(props['j'])

            u = props.get('u_component_of_wind_10m') or 0
            v = props.get('v_component_of_wind_10m') or 0

            u_grid[i, j] = u
            v_grid[i, j] = v

            lons.append(coords[0])
            lats.append(coords[1])
            u_vals.append(u)
            v_vals.append(v)

        print(f"Wind grid sampled: {len(lats)} points")

        response = requests.get(thumb_url, timeout=30)
        response.raise_for_status()

        print("Generating SAR thumbnail...")
        sar_image = Image.open(
            BytesIO(response.content)
        )

        # Generate figure
        print("Generating wind field visualization...")
        #plt.figure(figsize=(8, 8))

        # plt.style.use('dark_background')


        # Create map figure
        fig = plt.figure(figsize=(10, 10))
        print('Figure created successfully')

        ax = plt.axes(
            projection=ccrs.PlateCarree()
        )
        print('Axes created successfully')

        # Set AOI extent
        ax.set_extent([
            request.min_lon,
            request.max_lon,
            request.min_lat,
            request.max_lat
        ])
        print('AOI extent set successfully')

        # Add map features
        ax.add_feature(
            cfeature.LAND,
            facecolor='#1e1e1e'
        )
        print('features added successfully')

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

        # Create interpolation grid
        grid_x, grid_y = np.meshgrid(
            np.linspace(
                request.min_lon,
                request.max_lon,
                200
            ),
            np.linspace(
                request.min_lat,
                request.max_lat,
                200
            )
        )

        # Interpolate wind magnitude
        grid_magnitude = griddata(
            (lons, lats),
            magnitude,
            (grid_x, grid_y),
            method='linear'
        )

        grid_magnitude = np.ma.masked_invalid(
            grid_magnitude
        )

        filled = grid_magnitude.filled(np.nan)
        vmin = float(np.nanmin(filled))
        vmax = float(np.nanmax(filled))

        print(f"Wind speed range: {vmin:.2f} to {vmax:.2f} m/s")  # verify values in terminal

        ax.imshow(
            sar_image,
            extent=[
                request.min_lon,
                request.max_lon,
                request.min_lat,
                request.max_lat
            ],
            transform=ccrs.PlateCarree(),
            alpha=0.35
        )

        norm = Normalize(vmin=vmin, vmax=vmax)

        heatmap = ax.imshow(
            grid_magnitude,
            extent=[
                request.min_lon,
                request.max_lon,
                request.min_lat,
                request.max_lat
            ],
            origin='lower',
            cmap='viridis',
            alpha=0.40,
            transform=ccrs.PlateCarree(),
            norm = norm
        )

        sm = ScalarMappable(cmap='viridis', norm=norm)
        sm.set_array([])  # required for colorbar to read norm correctly

        cbar = plt.colorbar(
            sm,
            ax=ax,
            shrink=0.8,
            pad=0.03
        )

        cbar.set_label('Wind Speed Magnitude (m/s)', color='white')
        cbar.ax.tick_params(colors='white', labelsize=8)
        cbar.outline.set_edgecolor('white')

        ax.streamplot(
            lon_values,
            lat_values,
            u_grid,
            v_grid,
            color='white',
            linewidth=0.5,
            density=1.8,
            maxlength=1.2,
            transform=ccrs.PlateCarree()
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

        print(f"Image saved to: {filepath}")
        print(f"File exists: {os.path.exists(filepath)}")
        print(f"File size: {os.path.getsize(filepath)} bytes")

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
        print("FULL ERROR:", traceback.format_exc()) 
        return {
            "error": str(e)
        }
