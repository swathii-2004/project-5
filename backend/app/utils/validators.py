import magic
from fastapi import UploadFile, HTTPException

async def validate_file(file: UploadFile) -> None:
    # Read first 2048 bytes for MIME detection
    file_bytes = await file.read(2048)
    mime_type = magic.from_buffer(file_bytes, mime=True)
    
    allowed_mimes = ["application/pdf", "image/jpeg", "image/png"]
    if mime_type not in allowed_mimes:
        await file.seek(0)
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, JPG, PNG allowed.")
        
    # Read full file to check size
    await file.seek(0)
    full_content = await file.read()
    file_size = len(full_content)
    
    if file_size > 5 * 1024 * 1024:
        await file.seek(0)
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")
        
    ext = ""
    if file.filename:
        ext = file.filename.split(".")[-1].lower()
    
    ext_to_mime = {
        "pdf": "application/pdf",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png"
    }
    
    if ext not in ext_to_mime or ext_to_mime[ext] != mime_type:
        await file.seek(0)
        raise HTTPException(status_code=400, detail="File type mismatch.")

    await file.seek(0)
