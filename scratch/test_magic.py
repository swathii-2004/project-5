import magic
try:
    print(magic.from_buffer(b"%PDF-1.4", mime=True))
    print("Magic is working")
except Exception as e:
    print(f"Magic failed: {e}")
