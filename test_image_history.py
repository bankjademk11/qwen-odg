import requests
import json

# Test the global image history endpoint
print("Testing global image history endpoint...")
response = requests.get('http://localhost:5000/product/image-history-all')
print("Global Image History API Response:")
print(json.dumps(response.json(), indent=2, ensure_ascii=False))

# Test the per-product image history endpoint
print("\nTesting per-product image history endpoint...")
response = requests.get('http://localhost:5000/product/image-history/130501-0201')
print("Per-Product Image History API Response:")
print(json.dumps(response.json(), indent=2, ensure_ascii=False))

# Test the revert image functionality
print("\nTesting revert image functionality...")
revert_data = {
    "item_code": "130501-0201",
    "history_id": 6
}
response = requests.post('http://localhost:5000/product/revert-image', 
                        json=revert_data,
                        headers={'Content-Type': 'application/json'})
print("Revert Image API Response:")
print(json.dumps(response.json(), indent=2, ensure_ascii=False))