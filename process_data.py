# Process the DEM data to generate smoothed contour polygons at reasonable depth intervals (e.g., 0m, 0.5m, 1m, 2m, 5m, 10m).
# USACE hydro survey data contains DEMs and processed contour polygons. We don’t want their contour polygons as they are jagged in many cases. Come up with a way to produce non-jagged contours from the DEMs.
# Store the processed bathymetry contours in a PostGIS database.
