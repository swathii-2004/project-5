import pytest
from app.utils.encryption import encrypt, decrypt

def test_encrypt_decrypt_basic():
    text = "hello@123"
    assert decrypt(encrypt(text)) == text

def test_encrypt_random_iv():
    text = "test"
    enc1 = encrypt(text)
    enc2 = encrypt(text)
    assert enc1 != enc2

def test_decrypt_invalid_format():
    with pytest.raises(Exception):
        decrypt("invalid_string_without_colon")

def test_encrypt_none():
    assert encrypt(None) is None

def test_encrypt_empty_string():
    assert encrypt("") == ""

def test_encrypt_special_chars():
    texts = ["कक्षा", "hello world!", "123-456"]
    for text in texts:
        assert decrypt(encrypt(text)) == text

def test_encrypt_format():
    text = "test"
    enc = encrypt(text)
    assert enc.count(":") == 1

def test_decrypt_invalid_base64():
    with pytest.raises(Exception):
        decrypt("invalid_base64:invalid_base64")

def test_decrypt_wrong_key():
    from app.config import settings
    original_key = settings.AES_SECRET_KEY
    enc = encrypt("test secret")
    
    # Temporarily change key
    settings.AES_SECRET_KEY = "0" * 32
    try:
        with pytest.raises(Exception):
            decrypt(enc)
    finally:
        settings.AES_SECRET_KEY = original_key

def test_decrypt_none():
    assert decrypt(None) is None

def test_decrypt_empty_string():
    assert decrypt("") == ""
