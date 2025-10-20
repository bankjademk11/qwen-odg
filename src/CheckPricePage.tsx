import React, { useState, useEffect, useRef } from 'react';
import { Container, Form, Button, Card, Row, Col, Alert, Spinner, Badge } from 'react-bootstrap';
import { FaBarcode, FaBoxOpen, FaHashtag, FaWarehouse, FaSearch, FaExclamationTriangle } from 'react-icons/fa';
import NavigationBar from './NavigationBar';
import './CheckPricePage.css';

interface Product {
  item_code: string;
  item_name: string;
  price: number;
  unit_code: string;
  url_image: string;
  stock_quantity: number;
  barcode?: string;
}

interface Warehouse {
  code: string;
  name: string;
}

interface Location {
  code: string;
  name: string;
}

const CheckPricePage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const productCardRef = useRef<HTMLDivElement>(null);

  // Effect to scroll to product card when found
  useEffect(() => {
    if (foundProduct) {
      setTimeout(() => {
        productCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100); // A small delay to ensure the element is rendered
    }
  }, [foundProduct]);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('1301');
  const [selectedLocation, setSelectedLocation] = useState<string>('130101');

  // Debounced search effect
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm.trim().length >= 3) {
        handleSearch();
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Fetch warehouses
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_FLASK_API_URL}/warehouse`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setWarehouses(data.list);
        if (data.list.length > 0 && !selectedWarehouse) {
          setSelectedWarehouse(data.list[0].code);
        }
      } catch (e: any) {
        console.error("Failed to fetch warehouses:", e);
      }
    };
    fetchWarehouses();
  }, []);

  // Fetch locations when warehouse changes
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_FLASK_API_URL}/location/${selectedWarehouse}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setLocations(data.list);
        
        if (data.list && data.list.length > 0) {
          setSelectedLocation(data.list[0].code);
        } else {
          setSelectedLocation('');
        }
      } catch (e: any) {
        console.error("Failed to fetch locations:", e);
      }
    };
    if (selectedWarehouse) {
      fetchLocations();
    }
  }, [selectedWarehouse]);

  const getImageUrl = (product: Product) => {
    const imageBaseUrl = 'https://www.odienmall.com/static/image/product/';
    if (product.url_image && product.url_image.trim() !== '') {
      if (product.url_image.startsWith('http')) {
        return product.url_image;
      }
      return `${imageBaseUrl}${product.url_image}`;
    }
    return '/image/exam.jpg';
  };

  const handleSearch = async () => {
    const termToSearch = searchTerm.trim();
    if (!termToSearch) {
      return;
    }

    setError(null);
    setFoundProduct(null);
    setLoading(true);

    try {
      const params = new URLSearchParams({
        whcode: selectedWarehouse,
        loccode: selectedLocation,
        search: termToSearch,
      });

      const response = await fetch(`${import.meta.env.VITE_CHECK_PRICE_API_URL}/api/check-price-product?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data && data.length > 0) {
        const product = data[0];
        setFoundProduct({
          item_code: product.item_code,
          item_name: product.item_name,
          price: parseFloat(product.price) || 0,
          unit_code: product.unit_code,
          url_image: product.url_image || '',
          stock_quantity: parseInt(product.stock_quantity, 10) || 0,
          barcode: product.barcode || ''
        });
        // Clear search term and focus for next search
        setSearchTerm('');
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      } else {
        setError('ບໍ່ພົບສິນຄ້າທີ່ຄົ້ນຫາ');
        // Clear search term and focus for next search even when product not found
        setSearchTerm('');
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      }
    } catch (e: any) {
      console.error("Error fetching product:", e);
      setError(`ເກີດຂໍ້ຜິດພາດໃນການຄົ້ນຫາ: ${e.message}`);
      // Focus back to input for next search attempt
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  // Function to determine stock status badge
  const getStockStatusBadge = (quantity: number) => {
    if (quantity <= 0) {
      return <Badge bg="secondary">Out of Stock</Badge>;
    } else if (quantity < 10) {
      return <Badge bg="warning" text="dark">Low Stock</Badge>;
    } else {
      return <Badge bg="success">In Stock</Badge>;
    }
  };

  return (
    <>
      <Container className="mt-4">
        <div className="product-list-container">
          <div className="product-list-header mb-4">
            <h1 className="mb-0">ກວດສອບລາຄາສິນຄ້າ</h1>
            <p className="text-muted mb-0">ຄົ້ນຫາຂໍ້ມູນລາຄາ ແລະ ສະຕັອກສິນຄ້າ</p>
          </div>

          <Card className="mb-4 filter-section">
            <Card.Body>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="form-label">ສາງ:</Form.Label>
                    <Form.Select
                      value={selectedWarehouse}
                      onChange={(e) => setSelectedWarehouse(e.target.value)}
                      disabled={loading}
                      className="form-control-sm"
                    >
                      {warehouses.map((wh) => (
                        <option key={wh.code} value={wh.code}>
                          {wh.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="form-label">ບ່ອນເກັບ:</Form.Label>
                    <Form.Select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      disabled={loading || locations.length === 0}
                      className="form-control-sm"
                    >
                      {locations.map((loc) => (
                        <option key={loc.code} value={loc.code}>
                          {loc.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label className="form-label-search">ຄົ້ນຫາສິນຄ້າ (ລະຫັດ, ຊື່, ຫຼື ບາໂຄດ)</Form.Label>
                <div className="input-group">
                  <span className="input-group-text">
                    <FaSearch />
                  </span>
                  <Form.Control
                    ref={searchInputRef}
                    type="text"
                    placeholder="ປ້ອນລະຫັດສິນຄ້າ, ຊື່, ຫຼື ບາໂຄດ"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                    autoFocus
                    className="form-control-lg"
                    disabled={loading}
                  />
                </div>
              </Form.Group>
            </Card.Body>
          </Card>

          {error && (
            <Alert variant="secondary" className="not-found-alert">
              <div className="d-flex align-items-center">
                <FaExclamationTriangle className="me-2" size={24} />
                <div>
                  <Alert.Heading className="mb-0">ບໍ່ພົບສິນຄ້າທີ່ຄົ້ນຫາ</Alert.Heading>
                  <p className="mb-0 mt-1">ກະລຸນາກວດສອບຄຳຄົ້ນຫາ ແລະ ລອງໃໝ່ອີກຄັ້ງ</p>
                  {searchTerm && (
                    <p className="mb-0 mt-1">
                      <strong>ຄຳຄົ້ນຫາຂອງທ່ານ:</strong> "{searchTerm}"
                    </p>
                  )}
                </div>
              </div>
            </Alert>
          )}

          {loading && (
            <div className="d-flex justify-content-center mt-4">
              <Spinner animation="border" variant="secondary" role="status">
                <span className="visually-hidden">ກຳລັງຄົ້ນຫາ...</span>
              </Spinner>
            </div>
          )}

          {!loading && foundProduct && (
            <Card className="product-table" ref={productCardRef}>
              <Card.Header>
                <h5 className="mb-0">ຂໍ້ມູນສິນຄ້າ</h5>
              </Card.Header>
              <Card.Body>
                <Row className="align-items-center">
                  <Col lg={4} className="text-center mb-4 mb-lg-0">
                    <div className="product-image-container p-3">
                      <img
                        src={getImageUrl(foundProduct)}
                        alt={foundProduct.item_name}
                        className="img-fluid rounded shadow-sm"
                        style={{ 
                          maxWidth: '200px', 
                          maxHeight: '200px', 
                          objectFit: 'contain',
                          border: '1px solid #e9ecef'
                        }}
                      />
                    </div>
                  </Col>
                  <Col lg={8}>
                    <div className="product-details">
                      <h2 className="product-name mb-4">{foundProduct.item_name}</h2>

                      <div className="detail-item">
                        <div className="detail-label">
                          <FaHashtag className="me-2" />
                          <strong>ລະຫັດສິນຄ້າ:</strong>
                        </div>
                        <div className="detail-value">{foundProduct.item_code}</div>
                      </div>

                      {foundProduct.barcode && (
                        <div className="detail-item">
                          <div className="detail-label">
                            <FaBarcode className="me-2" />
                            <strong>ບາໂຄດ:</strong>
                          </div>
                          <div className="detail-value">{foundProduct.barcode}</div>
                        </div>
                      )}

                      <div className="detail-item">
                        <div className="detail-label">
                          <FaBoxOpen className="me-2" />
                          <strong>ຫົວໜ່ວຍ:</strong>
                        </div>
                        <div className="detail-value">{foundProduct.unit_code}</div>
                      </div>

                      <div className="detail-item">
                        <div className="detail-label">
                          <FaWarehouse className="me-2" />
                          <strong>ຈຳນວນໃນສະຕັອກ:</strong>
                        </div>
                        <div className="detail-value">
                          <span className="fs-5 fw-bold">{foundProduct.stock_quantity}</span>
                          <span className="ms-2">{getStockStatusBadge(foundProduct.stock_quantity)}</span>
                        </div>
                      </div>

                      <div className="price-section mt-3">
                        <div className="price-label">ລາຄາ:</div>
                        <div className="price-value">
                          {foundProduct.price.toLocaleString('en-US')} ₭
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}
          
          {!loading && !foundProduct && !error && (
            <Card className="text-center p-5 empty-state-card">
              <Card.Body>
                <FaSearch className="text-muted" size={48} />
                <h3 className="mt-3">ກະລຸນາປ້ອນຂໍ້ມູນເພື່ອຄົ້ນຫາສິນຄ້າ</h3>
                <p className="text-muted">
                  ປ້ອນລະຫັດສິນຄ້າ, ຊື່ສິນຄ້າ ຫຼື ບາໂຄດໃນຊ່ອງຄົ້ນຫາຂ້າງເທິງ
                </p>
              </Card.Body>
            </Card>
          )}
        </div>
      </Container>
    </>
  );
};

export default CheckPricePage;