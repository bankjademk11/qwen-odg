import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Form, Spinner, Alert, ButtonGroup, ToggleButton } from 'react-bootstrap';
import NavigationBar from './NavigationBar';
import './POSPage.css';

const ITEMS_PER_PAGE = 30;

// Interface for Product and CartItem
interface Product {
  id: string; // item_code
  name: string; // item_name
  price: number;
  image: string;
  stock_quantity: number;
  unit_code: string;
}

interface CartItem extends Product {
  quantity: number;
}

const mockCustomers = [
  { id: 'CUST-001', name: 'ລູກຄ້າທົ່ວໄປ (General Customer)' },
  { id: 'CUST-002', name: 'ທ່ານ ສົມຊາຍ (Mr. Somchai)' },
  { id: 'CUST-003', name: 'ບໍລິສັດ ABC ຈຳກັດ (ABC Co., Ltd.)' },
];

const POSPage = () => {
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
      const savedCart = localStorage.getItem('posCart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error("Could not parse cart from localStorage", error);
      return [];
    }
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('posCart', JSON.stringify(cart));
    } catch (error) {
      console.error("Could not save cart to localStorage", error);
    }
  }, [cart]);

  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');


  const productGridRef = useRef<HTMLDivElement>(null);
  const throttleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProducts = useCallback(async (currentOffset: number) => {
    if (currentOffset === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const response = await fetch(`http://localhost:8004/api/pos-products?limit=${ITEMS_PER_PAGE}&offset=${currentOffset}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const formattedProducts = data.map((p: any) => ({
        id: p.item_code,
        name: p.item_name,
        price: parseFloat(p.price) || 0,
        image: p.image,
        stock_quantity: p.stock_quantity,
        unit_code: p.unit_code
      }));

      setProducts(prev => currentOffset === 0 ? formattedProducts : [...prev, ...formattedProducts]);
      setHasMore(data.length === ITEMS_PER_PAGE);
      setOffset(currentOffset + ITEMS_PER_PAGE);

    } catch (e: any) {
      setError(e.message);
    } finally {
      if (currentOffset === 0) setLoading(false);
      else setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
        try {
          const response = await fetch(`http://localhost:8004/api/units`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setCategories(['All', ...data]); 
        } catch (e: any) {
          setCategoriesError(e.message);
          console.error("Failed to fetch categories:", e);
        }
      };

      fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts(0);
  }, [fetchProducts]);

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
      const existingItem = currentCart.find(item => item.id === product.id);
      if (existingItem) {
        return currentCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(currentCart => currentCart.filter(item => item.id !== productId));
    } else {
      setCart(currentCart =>
        currentCart.map(item =>
          item.id === productId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const filteredProducts = products
    .filter(product => selectedCategory === 'All' || product.unit_code === selectedCategory)
    .filter(product => product.name.toLowerCase().includes(searchTerm.toLowerCase()));

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
              <div className="p-3 border-bottom">
                <p className="mb-2 fw-bold">ໝວດໝູ່:</p>
                {categoriesError && <Alert variant="warning">ບໍ່ສາມາດໂຫລດໝວດໝູ່ໄດ້.</Alert>}
                <ButtonGroup className="flex-wrap">
                  {categories.map((category, idx) => (
                    <ToggleButton
                      key={idx}
                      id={`category-${idx}`}
                      type="radio"
                      variant="outline-secondary"
                      name="category"
                      value={category}
                      checked={selectedCategory === category}
                      onChange={(e) => setSelectedCategory(e.currentTarget.value)}
                      className="m-1 rounded"
                    >
                      {category}
                    </ToggleButton>
                  ))}
                </ButtonGroup>
              </div>
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
                    {filteredProducts.map(product => (
                      <Card key={product.id} className="product-card" onClick={() => addToCart(product)}>
                        <Card.Img variant="top" src={product.image} className="product-image"/>
                        <Card.Body className="text-center">
                          <Card.Title as="div" className="product-name">{product.name}</Card.Title>
                          <Card.Text className="product-code">{product.id} ({product.unit_code})</Card.Text>
                          <Card.Text className="product-price">{product.price.toLocaleString()} ₭</Card.Text>
                        </Card.Body>
                      </Card>
                    ))}
                    {loadingMore && (
                      <div className="d-flex justify-content-center p-3 w-100">
                        <Spinner animation="border" size="sm" />
                      </div>
                    )}
                    {filteredProducts.length === 0 && !loading && (
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
                  onChange={e => setSelectedCustomer(e.target.value)}
                >
                  <option value="">-- ເລືອກລູກຄ້າ --</option>
                  {mockCustomers.map(customer => (
                    <option key={customer.id} value={customer.id}>
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
                      <ListGroup.Item key={item.id} className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-bold">{item.name}</div>
                          <div>{item.price.toLocaleString()} ₭</div>
                        </div>
                        <div className="d-flex align-items-center">
                          <Button variant="outline-secondary" size="sm" onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</Button>
                          <span className="mx-2">{item.quantity}</span>
                          <Button variant="outline-secondary" size="sm" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</Button>
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
                    <Button variant="primary" size="lg" disabled={cart.length === 0 || !selectedCustomer}>
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

export default POSPage;
 POSPage;
