import cloudinary.uploader
from fastapi import UploadFile
from app.utils.validators import validate_file

async def upload_to_cloudinary(file: UploadFile, folder: str) -> str:
    await validate_file(file)
    file_bytes = await file.read()
    
    # Upload to Cloudinary
    response = cloudinary.uploader.upload(file_bytes, folder=folder)
    return response.get("secure_url")
