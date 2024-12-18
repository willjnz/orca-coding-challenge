import zipfile
import os

def extract_kmz(kmz_file_path, output_dir):
    """
    Extracts the contents of a KMZ file.

    Args:
        kmz_file_path (str): Path to the KMZ file.
        output_dir (str): Directory where the contents will be extracted.

    Returns:
        None
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    with zipfile.ZipFile(kmz_file_path, 'r') as kmz:
        kmz.extractall(output_dir)
        print(f"Contents extracted to: {output_dir}")

# Example usage
kmz_file_path = 'C:\\aaaWork\orca\\orca-coding-challenge\\data_processing\\unzipped_files\\IC_03_T10_20241205_CS_TIN.kmz'  # Path to your KMZ file
output_dir = 'C:\\aaaWork\orca\\orca-coding-challenge\\data_processing'  # Directory to store extracted contents
extract_kmz(kmz_file_path, output_dir)
