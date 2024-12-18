import requests
import subprocess

# Step 1: Download the data
def download_data(url, output_file):
    response = requests.get(url)
    if response.status_code == 200:
        with open(output_file, 'wb') as f:
            f.write(response.content)
        print(f"Data downloaded successfully to {output_file}")
    else:
        print(f"Failed to download data. Status code: {response.status_code}")

# Step 2: Smooth the raster using gdalwarp
def smooth_raster(input_file, output_file):
    command = [
        "gdalwarp",
        "-r", "bilinear",
        "-tr", "0.0033334", "0.0033334",  # Assuming the target cell size is 90m in degrees
        input_file,
        output_file,
        "-overwrite"
    ]
    subprocess.run(command, check=True)
    print(f"Raster smoothed: {output_file}")

# Step 3: Generate contours and write them to PostGIS for specified intervals
def generate_contours_and_write_to_postgis(input_file, interval, postgis_connection):
    output_layer = f"bathymetry_contours_{interval}"
    command = [
        "gdal_contour",
        "-i", str(interval),  # Interval of contours
        "-f", "PostgreSQL",  # Output format
        "-a", "depth_m",  # Attribute name for depth
        input_file,
        f"PG:{postgis_connection}",
        "-nln", output_layer
    ]
    subprocess.run(command, check=True)
    print(f"Contours generated and saved to PostGIS: {output_layer}")

def main():
    # Set up parameters
    url = "https://gis.ngdc.noaa.gov/arcgis/rest/services/multibeam_mosaic/ImageServer/exportImage?bbox=-121.11583,34.97083,-120.59250,35.24500&bboxSR=4326&size=628,329&imageSR=4326&format=tiff&nodata=0&pixelType=F32&interpolation=+RSP_NearestNeighbor&compression=LZ77&renderingRule={%22rasterFunction%22:%22none%22}&f=image"
    raw_image_file = "exportImage.tiff"  # TIFF file after download
    smoothed_raster_file = "bathymetry_smoothed.tiff"
    postgis_connection = "host=localhost user=postgres dbname=postgres password=postgres"
    
    # Download the raw image
    download_data(url, raw_image_file)

    # Smooth the raster
    smooth_raster(raw_image_file, smoothed_raster_file)

    # Generate contours for intervals 5 and 10 and write to PostGIS
    for interval in [5, 10]:
        generate_contours_and_write_to_postgis(smoothed_raster_file, interval, postgis_connection)

if __name__ == "__main__":
    main()
