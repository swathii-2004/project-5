import os
import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
from app.config import settings

def encrypt(plain_text: str) -> str:
    if plain_text is None or plain_text == "":
        return plain_text
        
    iv = os.urandom(16)
    key = settings.AES_SECRET_KEY.encode('utf-8')
    
    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(plain_text.encode('utf-8')) + padder.finalize()
    
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded_data) + encryptor.finalize()
    
    return base64.b64encode(iv).decode('utf-8') + ":" + base64.b64encode(ciphertext).decode('utf-8')

def decrypt(cipher_text: str) -> str:
    if cipher_text is None or cipher_text == "":
        return cipher_text
        
    parts = cipher_text.split(":")
    if len(parts) != 2:
        raise ValueError("Invalid cipher text format")
        
    iv = base64.b64decode(parts[0])
    ciphertext = base64.b64decode(parts[1])
    key = settings.AES_SECRET_KEY.encode('utf-8')
    
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    padded_data = decryptor.update(ciphertext) + decryptor.finalize()
    
    unpadder = padding.PKCS7(128).unpadder()
    plain_text_bytes = unpadder.update(padded_data) + unpadder.finalize()
    
    return plain_text_bytes.decode('utf-8')
