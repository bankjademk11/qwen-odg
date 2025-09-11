import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Form, Spinner, Alert, Nav } from 'react-bootstrap';
import NavigationBar from './NavigationBar';
import './POSPage.css';

const ITEMS_PER_PAGE = 30;

// Interface for Product and CartItem
interface Product {
  item_code: string;
  item_name: string;
  price: number;
  image: string;
  url_image: string; // เพิ่ม property สำหรับ URL รูปภาพ
  stock_quantity: number;
  unit_code: string;
}

interface CartItem extends Product {
  qty: number;
}

// Interface for Category with count
interface Category {
  name: string;
  count: number;
}

const mockCustomers = [
  { code: 'CUST-001', name: 'ລູກຄ້າທົ່ວໄປ (General Customer)' },
  { code: 'CUST-002', name: 'ທ່ານ ສົມຊາຍ (Mr. Somchai)' },
  { code: 'CUST-003', name: 'ບໍລິສັດ ABC ຈຳກັດ (ABC Co., Ltd.)' },
];

const POSPageFlask = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // Initial page load
  const [loadingMore, setLoadingMore] = useState<boolean>(false); // Subsequent loads
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  
  const [searchTerm, setSearchTerm] = useState('');

  // Load cart from localStorage on initial render
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem('posCartFlask');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error("Could not parse cart from localStorage", error);
      return [];
    }
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('posCartFlask', JSON.stringify(cart));
    } catch (error) {
      console.error("Could not save cart to localStorage", error);
    }
  }, [cart]);

  const [categories, setCategories] = useState<Category[]>([{name: 'All', count: 0}]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('1301');
  const [selectedLocation, setSelectedLocation] = useState<string>('01');

  const productGridRef = useRef<HTMLDivElement>(null);
  const categoryTabsRef = useRef<HTMLDivElement>(null);
  const throttleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch warehouses
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const response = await fetch('http://localhost:5000/warehouse');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setWarehouses(data.list);
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
        const response = await fetch(`http://localhost:5000/location/${selectedWarehouse}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setLocations(data.list);
        
        // Set default location if available
        if (data.list && data.list.length > 0) {
          setSelectedLocation(data.list[0].code);
        }
      } catch (e: any) {
        console.error("Failed to fetch locations:", e);
      }
    };

    fetchLocations();
  }, [selectedWarehouse]);

  const fetchProducts = useCallback(async (currentOffset: number) => {
    if (currentOffset === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        whcode: selectedWarehouse,
        loccode: selectedLocation,
        search: searchTerm,
        limit: ITEMS_PER_PAGE.toString(),
        offset: currentOffset.toString()
      });
      
      if (selectedCategory !== 'All') {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`http://localhost:5000/product?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      const formattedProducts = data.list.map((p: any) => ({
        item_code: p.item_code,
        item_name: p.item_name,
        price: parseFloat(p.price) || 0,
        image: p.image,
        url_image: p.url_image || '', // ดึงค่า url_image ถ้ามี
        stock_quantity: p.stock_quantity,
        unit_code: p.unit_code,
        qty: 1 // Default quantity
      }));

      setProducts(prev => currentOffset === 0 ? formattedProducts : [...prev, ...formattedProducts]);
      setHasMore(data.list.length === ITEMS_PER_PAGE);
      setOffset(currentOffset + ITEMS_PER_PAGE);

    } catch (e: any) {
      setError(e.message);
    } finally {
      if (currentOffset === 0) setLoading(false);
      else setLoadingMore(false);
    }
  }, [selectedWarehouse, selectedLocation, searchTerm, selectedCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:5000/category?whcode=${selectedWarehouse}&loccode=${selectedLocation}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Format categories with count
      const formattedCategories: Category[] = [
        { name: 'All', count: data.list.reduce((sum: number, c: any) => sum + (c.count || 0), 0) },
        ...data.list.map((c: any) => ({ name: c.name_1, count: c.count }))
      ];
      
      setCategories(formattedCategories);
    } catch (e: any) {
      setCategoriesError(e.message);
      console.error("Failed to fetch categories:", e);
    }
  }, [selectedWarehouse, selectedLocation]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    // Reset products when changing category, warehouse or location
    setProducts([]);
    setOffset(0);
    setHasMore(true);
    fetchProducts(0);
  }, [fetchProducts, selectedCategory, selectedWarehouse, selectedLocation]);

  const handleScroll = () => {
    if (throttleTimer.current) return;

    throttleTimer.current = setTimeout(() => {
      if (productGridRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = productGridRef.current;
        if (scrollTop + clientHeight >= scrollHeight * 0.8 && hasMore && !loadingMore) {
          fetchProducts(offset);
        }
      }
      throttleTimer.current = null;
    }, 300); 
  };

  useEffect(() => {
    const gridElement = productGridRef.current;
    if (gridElement) {
      gridElement.addEventListener('scroll', handleScroll);
      return () => gridElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const addToCart = (product: Product) => {
    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.item_code === product.item_code);
      if (existingItem) {
        return currentCart.map(item =>
          item.item_code === product.item_code ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...currentCart, { ...product, qty: 1 }];
    });
  };

  const updateQuantity = (productCode: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(currentCart => currentCart.filter(item => item.item_code !== productCode));
    } else {
      setCart(currentCart =>
        currentCart.map(item =>
          item.item_code === productCode ? { ...item, qty: newQuantity } : item
        )
      );
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  // Process billing
  const processBilling = async () => {
    if (cart.length === 0 || !selectedCustomer) {
      alert('ກະລຸນາເລືອກລູກຄ້າ ແລະ ເລືອກສິນຄ້າໃສ່ກະຕ່າກ່ອນ');
      return;
    }

    try {
      // Get document number
      const docNoResponse = await fetch('http://localhost:5000/docno');
      if (!docNoResponse.ok) {
        throw new Error('Failed to get document number');
      }
      const docNoData = await docNoResponse.json();
      const docNo = docNoData.docno;

      // Prepare billing data
      const billingData = {
        doc_no: docNo,
        doc_date: new Date().toISOString().split('T')[0],
        customer_code: selectedCustomer,
        total_amount: total,
        items: cart.map(item => ({
          item_code: item.item_code,
          item_name: item.item_name,
          unit_code: item.unit_code,
          qty: item.qty,
          price: item.price,
          amount: item.price * item.qty
        })),
        user_code: 'USER001' // This should come from actual user session
      };

      // Send billing request
      const response = await fetch('http://localhost:5000/posbilling', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(billingData)
      });

      if (!response.ok) {
        throw new Error('Failed to process billing');
      }

      const result = await response.json();
      if (result.success) {
        alert(`ບິນໄດ້ຖືກບັນທຶກສຳເລັດ! ເລກບິນ: ${docNo}`);
        // Clear cart after successful billing
        setCart([]);
      } else {
        alert(`ມີຂໍ້ຜິດພາດໃນການບັນທຶກບິນ: ${result.error}`);
      }
    } catch (error) {
      console.error('Error processing billing:', error);
      alert('ມີຂໍ້ຜິດພາດໃນການບັນທຶກບິນ');
    }
  };

  // ฟังก์ชันเพื่อเลือก URL รูปภาพที่เหมาะสม
  const getImageUrl = (product: Product) => {
    // ถ้ามี url_image และไม่ใช่ค่าว่าง ให้ใช้ url_image
    if (product.url_image && product.url_image.trim() !== '') {
      return product.url_image;
    }
    // ถ้าไม่มี url_image ให้ใช้ image (default)
    return product.image || '/image/exam.jpg';
  };

  return (
    <>
      <NavigationBar />
      <Container fluid className="pos-container mt-4">
        <Row>
          {/* Product Selection */}
          <Col md={7}>
            <Card className="h-100">
              <Card.Header>
                <Row className="align-items-center">
                    <Col xs={12} sm={5} className="mb-2 mb-sm-0">
                        <h4 className="mb-0">ເລືອກສິນຄ້າ</h4>
                    </Col>
                    <Col xs={12} sm={7}>
                        <Form.Control
                        type="text"
                        placeholder="ຄົ້ນຫາສິນຄ້າ..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </Col>
                </Row>
              </Card.Header>
              
              {/* Warehouse and Location Selection */}
              <div className="p-3 border-bottom">
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>ສາງ:</Form.Label>
                      <Form.Select 
                        value={selectedWarehouse} 
                        onChange={(e) => setSelectedWarehouse(e.target.value)}
                      >
                        {warehouses.map(warehouse => (
                          <option key={warehouse.code} value={warehouse.code}>
                            {warehouse.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>ບ່ອນເກັບ:</Form.Label>
                      <Form.Select 
                        value={selectedLocation} 
                        onChange={(e) => setSelectedLocation(e.target.value)}
                      >
                        {locations.map(location => (
                          <option key={location.code} value={location.code}>
                            {location.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </div>
              
              {/* Category Tabs with Scroll and Sticky Header */}
              <div className="category-tabs-wrapper">
                <div className="p-3 border-bottom category-header-sticky">
                  <p className="mb-2 fw-bold">ໝວດໝູ່:</p>
                  {categoriesError && <Alert variant="warning">ບໍ່ສາມາດໂຫລດໝວດໝູ່ໄດ້.</Alert>}
                  <div className="category-tabs-container" ref={categoryTabsRef}>
                    <Nav variant="pills" className="category-tabs flex-nowrap overflow-auto">
                      {categories.map((category, idx) => (
                        <Nav.Item key={idx} className="me-2 mb-2">
                          <Nav.Link
                            eventKey={category.name}
                            active={selectedCategory === category.name}
                            onClick={() => setSelectedCategory(category.name)}
                            className={`category-tab ${selectedCategory === category.name ? "active" : ""}`}
                          >
                            <span className="category-name">{category.name}</span>
                            <span className="category-count badge bg-secondary ms-2">{category.count}</span>
                          </Nav.Link>
                        </Nav.Item>
                      ))}
                    </Nav>
                  </div>
                </div>
              </div>
              
              {/* Product Grid */}
              <Card.Body className="product-grid" ref={productGridRef}>
                {loading ? (
                  <div className="d-flex justify-content-center align-items-center h-100">
                    <Spinner animation="border" />
                    <span className="ms-3">ກຳລັງໂຫລດຂໍ້ມູນສິນຄ້າ...</span>
                  </div>
                ) : error ? (
                  <Alert variant="danger">ມີຂໍ້ຜິດພາດ: {error}</Alert>
                ) : (
                  <>
                    {products.map(product => (
                      <Card key={product.item_code} className="product-card" onClick={() => addToCart(product)}>
                        <Card.Img variant="top" src={getImageUrl(product)} className="product-image"/>
                        <Card.Body className="text-center">
                          <Card.Title as="div" className="product-name">{product.item_name}</Card.Title>
                          <Card.Text className="product-code">{product.item_code} ({product.unit_code})</Card.Text>
                          <Card.Text className="product-price">{product.price.toLocaleString()} ₭</Card.Text>
                        </Card.Body>
                      </Card>
                    ))}
                    {loadingMore && (
                      <div className="d-flex justify-content-center p-3 w-100">
                        <Spinner animation="border" size="sm" />
                      </div>
                    )}
                    {products.length === 0 && !loading && (
                        <div className="w-100 text-center mt-4">
                            <p className="text-muted">ບໍ່ພົບສິນຄ້າທີ່ຕົງກັບການຄົ້ນຫາ</p>
                        </div>
                    )}
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Right Column: Customer and Cart */}
          <Col md={5}>
            {/* Customer Selection */}
            <Card className="mb-3">
              <Card.Header>
                <h5 className="mb-0">ຂໍ້ມູນລູກຄ້າ</h5>
              </Card.Header>
              <Card.Body>
                <Form.Select 
                  value={selectedCustomer} 
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                >
                  <option value="">-- ເລືອກລູກຄ້າ --</option>
                  {mockCustomers.map(customer => (
                    <option key={customer.code} value={customer.code}>
                      {customer.name}
                    </option>
                  ))}
                </Form.Select>
              </Card.Body>
            </Card>

            {/* Cart */}
            <Card>
              <Card.Header>
                <h4 className="mb-0">ກະຕ່າສິນຄ້າ</h4>
              </Card.Header>
              <Card.Body className="d-flex flex-column">
                <ListGroup variant="flush" className="flex-grow-1">
                  {cart.length === 0 ? (
                    <p className="text-center text-muted mt-3">ຍັງບໍ່ມີສິນຄ້າໃນກະຕ່າ</p>
                  ) : (
                    cart.map(item => (
                      <ListGroup.Item key={item.item_code} className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-bold">{item.item_name}</div>
                          <div>{item.price.toLocaleString()} ₭</div>
                        </div>
                        <div className="d-flex align-items-center">
                          <Button variant="outline-secondary" size="sm" onClick={() => updateQuantity(item.item_code, item.qty - 1)}>-</Button>
                          <span className="mx-2">{item.qty}</span>
                          <Button variant="outline-secondary" size="sm" onClick={() => updateQuantity(item.item_code, item.qty + 1)}>+</Button>
                        </div>
                      </ListGroup.Item>
                    ))
                  )}
                </ListGroup>
                <div className="mt-auto">
                  <hr />
                  <div className="d-flex justify-content-between fs-4 fw-bold">
                    <span>ລວມທັງໝົດ:</span>
                    <span>{total.toLocaleString()} ₭</span>
                  </div>
                  <div className="d-grid gap-2 mt-3">
                    <Button variant="primary" size="lg" disabled={cart.length === 0 || !selectedCustomer} onClick={processBilling}>
                      ຈ່າຍເງິນ
                    </Button>
                    <Button variant="outline-danger" size="lg" onClick={() => setCart([])}>
                      ຍົກເລີກ
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default POSPageFlask;