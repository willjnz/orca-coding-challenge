import mdal

# Input and output file paths
input_tin = "C:/Users/William Jones/Downloads/CENWS_DIS_GH_10_WHCX_20240717_CS_E_5_12_614/GH_10_WHCX_20240717_CS_E_5_12_614_tin/tdenv9.adf"
output_tif = "C:/Users/William Jones/Downloads/CENWS_DIS_GH_10_WHCX_20240717_CS_E_5_12_614/output.tif"

# Create an MDAL reader for the input TIN
tin = mdal.ESRI_TIN(input_tin)

# Convert to GeoTIFF (with desired resolution of 1x1)
tin.to_gdal(output_tif, res=(1, 1), driver="GTiff")
