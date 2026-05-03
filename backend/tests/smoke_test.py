import argparse
import requests
import sys

def run_smoke_test(base_url: str):
    print(f"Starting smoke tests against {base_url}...\n")
    passed = 0
    failed = 0

    def assert_test(name: str, condition: bool, error_msg: str = ""):
        nonlocal passed, failed
        if condition:
            print(f"✅ {name}")
            passed += 1
        else:
            print(f"❌ {name} - {error_msg}")
            failed += 1

    # 1. Health & Security Headers
    try:
        res = requests.get(f"{base_url}/health")
        assert_test("Health Endpoint returns 200", res.status_code == 200, f"Status: {res.status_code}")
        
        headers = res.headers
        assert_test("HSTS Header Present", "Strict-Transport-Security" in headers)
        assert_test("X-Frame-Options is DENY", headers.get("X-Frame-Options") == "DENY")
        assert_test("X-Content-Type-Options is nosniff", headers.get("X-Content-Type-Options") == "nosniff")
    except Exception as e:
        print(f"❌ Health/Security Headers - Error: {e}")
        failed += 4

    # 2. Products List (Public)
    try:
        res = requests.get(f"{base_url}/api/v1/products/")
        assert_test("Products List returns 200", res.status_code == 200, f"Status: {res.status_code}")
        assert_test("Products List is valid JSON", "products" in res.json())
    except Exception as e:
        print(f"❌ Products List - Error: {e}")
        failed += 2

    # 3. Stores List (Public)
    try:
        # Use emergency search as it's a public endpoint that returns stores
        res = requests.get(f"{base_url}/api/v1/products/emergency?q=food&lat=12.97&lng=77.59&radius_km=10")
        assert_test("Emergency Search returns 200", res.status_code == 200, f"Status: {res.status_code}")
    except Exception as e:
        print(f"❌ Stores/Emergency Search - Error: {e}")
        failed += 1

    # 4. Auth - Invalid Login
    try:
        res = requests.post(f"{base_url}/api/v1/auth/login", json={
            "email": "invalid@doesnotexist.com",
            "password": "wrongpassword"
        })
        assert_test("Invalid Login rejected (401 or 403 or 404)", res.status_code in [401, 403, 404], f"Status: {res.status_code}")
    except Exception as e:
        print(f"❌ Auth Invalid Login - Error: {e}")
        failed += 1

    print(f"\n--- Smoke Test Results ---")
    print(f"Total Tests: {passed + failed}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")

    if failed > 0:
        print("\nSmoke tests FAILED. Do not deploy to production.")
        sys.exit(1)
    else:
        print("\nAll smoke tests PASSED! Deployment looks healthy.")
        sys.exit(0)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ProxiMart Production Smoke Tests")
    parser.add_argument("--url", default="http://localhost:8000", help="Base URL of the backend API")
    args = parser.parse_args()
    
    # Remove trailing slash if present
    url = args.url.rstrip("/")
    run_smoke_test(url)
