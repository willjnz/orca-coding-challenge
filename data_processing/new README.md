<!-- ##### install mdal
conda install -c conda-forge mdal-python
pip install mdal -->


docker build -t mdal-pipeline .

docker run -v /:/app mdal-pipeline
<!-- this command mounts your local directory to the /app directory in the container, allowing you to manage files easily on your local machine while running everything inside the container. -->