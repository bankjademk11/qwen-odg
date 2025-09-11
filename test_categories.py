import requests

# Test the category endpoint
response = requests.get('http://localhost:5000/category?whcode=1301&loccode=01')
print("Category API Response:")
print(response.json())

# Test the product endpoint with a category filter
response = requests.get('http://localhost:5000/product?whcode=1301&loccode=01&category=ກະຈົກ&limit=5&offset=0')
print("\nProduct API Response with Category Filter:")
print(response.json())