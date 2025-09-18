import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Form, Spinner, Alert, Nav, Modal, Toast, ToastContainer } from 'react-bootstrap';
import NavigationBar from './NavigationBar';
import { useNavigate } from 'react-router-dom';
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

// Interface for Customer
interface Customer {
  code: string;
  name: string;
}

const POSPageFlask = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // Initial page load
  const [loadingMore, setLoadingMore] = useState<boolean>(false); // Subsequent loads
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useRef<string>('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search term
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    searchTimeout.current = setTimeout(() => {
      debouncedSearchTerm.current = searchTerm;
      // Trigger product fetch with the debounced term
      setProducts([]);
      setOffset(0);
      setHasMore(true);
      fetchProducts(0);
    }, 500); // 500ms debounce delay

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchTerm]);
  
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

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const [categories, setCategories] = useState<Category[]>([{name: 'All', count: 0}]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('1301');
  const [selectedLocation, setSelectedLocation] = useState<string>('01');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [change, setChange] = useState<number>(0);
  const [isCartExpanded, setIsCartExpanded] = useState<boolean>(false);

  // State for bill parking
  const [showParkModal, setShowParkModal] = useState(false);
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [parkReferenceName, setParkReferenceName] = useState('');
  const [parkedBills, setParkedBills] = useState<any[]>([]);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');

  const showCustomToast = (message: string, variant: string = 'success') => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };

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

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('http://localhost:5000/customer');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCustomers(data.list); // Assuming the API returns { list: [...] }
      } catch (e: any) {
        console.error("Failed to fetch customers:", e);
      }
    };

    fetchCustomers();
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

  // Calculate change whenever total or amountReceived changes
  useEffect(() => {
    setChange(amountReceived - total);
  }, [amountReceived, total]);

  const fetchProducts = useCallback(async (currentOffset: number) => {
    if (currentOffset === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        whcode: selectedWarehouse,
        loccode: selectedLocation,
        search: debouncedSearchTerm.current,
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
        stock_quantity: parseInt(p.stock_quantity, 10) || 0,
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

  // Process billing
  const processBilling = async () => {
    if (cart.length === 0) {
      showCustomToast('ກະລຸນາເລືອກສິນຄ້າໃສ່ກະຕ່າກ່ອນ', 'warning');
      return;
    }
    if (!selectedCustomer) {
      showCustomToast('ກະລຸນາເລືອກລູກຄ້າກ່ອນ', 'warning');
      return;
    }
    if (amountReceived < total) {
      showCustomToast('ຈຳນວນເງິນທີ່ຮັບມາບໍ່ພຽງພໍ', 'warning');
      return;
    }

    try {
      // Step 1: Fetch the official document number from the backend
      const docNoResponse = await fetch('http://localhost:5000/docno');
      if (!docNoResponse.ok) {
        throw new Error('Failed to fetch document number.');
      }
      const docNoData = await docNoResponse.json();
      const docNo = docNoData.docno;

      if (!docNo) {
        throw new Error('Invalid document number received from backend.');
      }

      // Step 2: Prepare the billing data payload
      const billingData = {
        doc_no: docNo,
        doc_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        customer_code: selectedCustomer,
        total_amount: total,
        payment_method: paymentMethod,
        items: cart.map(item => ({
          ...item,
          amount: item.price * item.qty // Ensure 'amount' is calculated
        })),
        user_code: 'staff' // Example user_code, adjust as needed
      };

      // Step 3: Send the billing data to the backend
      const billingResponse = await fetch('http://localhost:5000/posbilling', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(billingData),
      });

      if (!billingResponse.ok) {
        const errorData = await billingResponse.json();
        throw new Error(errorData.error || 'Billing failed.');
      }

      const result = await billingResponse.json();

      // Step 4: Handle successful billing (UI updates)
      const newReceipt = {
        doc_no: result.doc_no,
        doc_date: new Date().toLocaleString(),
        customer_name: customers.find(c => c.code === selectedCustomer)?.name || selectedCustomer,
        total_amount: total,
        amount_received: amountReceived,
        change_amount: change,
        payment_method: paymentMethod,
        items: cart,
      };
      setReceiptData(newReceipt);
      setShowReceiptModal(true);

      // Save receipt to localStorage for history purposes
      const savedReceipts = JSON.parse(localStorage.getItem('posReceiptsFlask') || '[]');
      localStorage.setItem('posReceiptsFlask', JSON.stringify([newReceipt, ...savedReceipts]));

      showCustomToast(`ບິນໄດ້ຖືກບັນທຶກສຳເລັດ! ເລກບິນ: ${result.doc_no}`);
      
      // Clear cart and payment info after successful billing
      setCart([]);
      setAmountReceived(0);
      setChange(0);
      setCustomerSearch('');
      setSelectedCustomer('');

    } catch (error: any) {
      console.error('Billing process failed:', error);
      showCustomToast(error.message || 'ເກີດຂໍ້ຜິດພາດໃນການສ້າງບິນ', 'danger');
    }
  };

  const getImageUrl = (product: Product) => {
    const imageBaseUrl = 'https://www.odienmall.com/static/image/product/';
    // ถ้ามี url_image และไม่ใช่ค่าว่าง
    if (product.url_image && product.url_image.trim() !== '') {
      // For robustness, check if it's already a full URL
      if (product.url_image.startsWith('http')) {
        return product.url_image;
      }
      return `${imageBaseUrl}${product.url_image}`;
    }
    // Fallback if no image is specified
    return product.image || '/image/exam.jpg';
  };

  // --- Bill Parking Handlers ---

  const handleShowRecallModal = async () => {
    try {
      const savedParkedBills = JSON.parse(localStorage.getItem('posParkedBillsFlask') || '[]');
      setParkedBills(savedParkedBills);
      setShowRecallModal(true);
    } catch (error) {
      console.error('Error fetching parked bills from localStorage:', error);
      showCustomToast('Error fetching parked bills.', 'danger');
    }
  };

  const handleParkBill = async () => {
    if (!parkReferenceName) {
      showCustomToast('Please enter a reference name for the bill.', 'warning');
      return;
    }

    try {
      const newParkedBill = {
        id: Date.now(), // Unique ID for the parked bill
        reference_name: parkReferenceName,
        cart_data: cart,
        customer_code: selectedCustomer,
        customer_search: customerSearch,
        time: new Date().toLocaleString(),
      };

      const savedParkedBills = JSON.parse(localStorage.getItem('posParkedBillsFlask') || '[]');
      localStorage.setItem('posParkedBillsFlask', JSON.stringify([newParkedBill, ...savedParkedBills]));

      showCustomToast('Bill parked successfully!');
      setCart([]);
      setSelectedCustomer('');
      setCustomerSearch('');
      setParkReferenceName('');
      setShowParkModal(false);
    } catch (error) {
      console.error('Error parking bill to localStorage:', error);
      showCustomToast('Error parking bill.', 'danger');
    }
  };

  const handleRecallBill = async (bill: any) => {
    // Set cart and customer from the parked bill
    setCart(bill.cart_data || []);
    setSelectedCustomer(bill.customer_code || '');
    setCustomerSearch(bill.customer_search || '');

    // Delete the parked bill from localStorage
    try {
      const savedParkedBills = JSON.parse(localStorage.getItem('posParkedBillsFlask') || '[]');
      const updatedParkedBills = savedParkedBills.filter((pb: any) => pb.id !== bill.id);
      localStorage.setItem('posParkedBillsFlask', JSON.stringify(updatedParkedBills));
      setParkedBills(updatedParkedBills); // Update state immediately
      showCustomToast('Bill recalled and removed from parked list!');
    } catch (error) {
      console.error('Could not delete parked bill from localStorage, but recalling locally.', error);
      showCustomToast('Error removing parked bill from list.', 'danger');
    }
    
    setShowRecallModal(false);
  };

  return (
    <>
      <NavigationBar />
      <Container fluid className="pos-container mt-4">
        <Row>
          {/* Left Sidebar for POS functions */}
          <Col md={1} className="d-flex flex-column align-items-center p-2">
            <Button 
              variant="light" 
              className="mb-2 w-100 d-flex flex-column align-items-center justify-content-center text-primary"
              style={{ height: '80px' }}
              onClick={() => navigate('/sales-history')}
            >
              <i className="bi bi-clock-history fs-4"></i>
              <span style={{ fontSize: '0.75rem' }}>ປະຫວັດ</span>
            </Button>
          </Col>

          {/* Product Selection */}
          <Col md={6}>
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
                          <Card.Text className="product-stock text-muted"><small>ຄົງເຫຼືອ: {product.stock_quantity}</small></Card.Text>
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
                <div className="customer-search-wrapper">
                  <Form.Control
                    type="text"
                    placeholder="ຄົ້ນຫາດ້ວຍລະຫັດ ຫຼື ຊື່ລູກຄ້າ..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setIsCustomerDropdownOpen(true);
                      if (e.target.value === '') {
                        setSelectedCustomer(''); // Clear selection if search is cleared
                      }
                    }}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsCustomerDropdownOpen(false), 200)} // Delay to allow click
                  />
                  {isCustomerDropdownOpen && (
                    <div className="customer-search-results">
                      {customers
                        .filter(c => 
                          c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
                          c.code.toLowerCase().includes(customerSearch.toLowerCase())
                        )
                        .slice(0, 50) // Limit results to 50
                        .map(customer => (
                          <div
                            key={customer.code}
                            className="customer-search-item"
                            onClick={() => {
                              setSelectedCustomer(customer.code);
                              setCustomerSearch(`${customer.name} (${customer.code})`);
                              setIsCustomerDropdownOpen(false);
                            }}
                          >
                            {customer.name} ({customer.code})
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>

            {/* Cart */}
            <Card>
              <Card.Header>
                <h4 className="mb-0">ກະຕ່າສິນຄ້າ</h4>
              </Card.Header>
              <div className="p-3 border-bottom">
                <div className="d-grid gap-2">
                  <Button variant="primary" size="lg" disabled={cart.length === 0 || !selectedCustomer} onClick={processBilling}>
                    ຈ່າຍເງິນ
                  </Button>
                  <Row>
                    <Col>
                      <Button variant="info" className="w-100" disabled={cart.length === 0} onClick={() => setShowParkModal(true)}>
                        ພັກບິນ (Park Bill)
                      </Button>
                    </Col>
                    <Col>
                      <Button variant="secondary" className="w-100" onClick={handleShowRecallModal}>
                        ເອີ້ນບິນ (Recall Bill)
                      </Button>
                    </Col>
                  </Row>
                  <Button variant="outline-danger" size="lg" onClick={() => {
                    setCart([]);
                    setSelectedCustomer('');
                    setCustomerSearch('');
                  }}>
                    ຍົກເລີກ
                  </Button>
                </div>
              </div>
              <Card.Body className="d-flex flex-column">
                <ListGroup variant="flush" className="flex-grow-1 cart-items-scrollable">
                  {isCartExpanded ? (
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
                  ) : (
                    <p className="text-center text-muted mt-3">{cart.length === 0 ? 'ຍັງບໍ່ມີສິນຄ້າໃນກະຕ່າ' : `${cart.length} ລາຍການໃນກະຕ່າ`}</p>
                  )}
                </ListGroup>
                <div className="text-center mt-2">
                  {cart.length > 0 && (
                    <Button variant="link" onClick={() => setIsCartExpanded(!isCartExpanded)}>
                      {isCartExpanded ? 'ຍຸບລາຍການ' : 'ຂະຫຍາຍລາຍການ'}
                    </Button>
                  )}
                </div>
                <div className="mt-auto">
                  <hr />
                  <div className="d-flex justify-content-between fs-4 fw-bold">
                    <span>ລວມທັງໝົດ:</span>
                    <span>{total.toLocaleString()} ₭</span>
                  </div>

                  {/* Amount Received Input */}
                  <Form.Group className="my-3">
                    <Form.Label className="fw-bold">ເງິນທີ່ຮັບມາ:</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="0"
                      value={amountReceived === 0 ? '' : amountReceived}
                      onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                      min="0"
                    />
                  </Form.Group>

                  {/* Change Display */}
                  <div className="d-flex justify-content-between fs-4 fw-bold text-success mb-3">
                    <span>ເງິນທອນ:</span>
                    <span>{change.toLocaleString()} ₭</span>
                  </div>

                  <div className="d-flex justify-content-between fs-4 fw-bold">
                  </div>

                  {/* Payment Method Selection */}
                  <Form.Group className="my-3">
                      <Form.Label className="fw-bold">ວິທີຊຳລະເງິນ:</Form.Label>
                      <Form.Select 
                        value={paymentMethod} 
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <option value="cash">ເງິນສົດ (Cash)</option>
                        <option value="transfer">ໂອນຈ່າຍ (Transfer)</option>
                        <option value="card">ບັດເຄຣດິດ (Credit Card)</option>
                      </Form.Select>
                    </Form.Group>

                  </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* --- Modals for Bill Parking --- */}

      {/* Park Bill Modal */}
      <Modal show={showParkModal} onHide={() => setShowParkModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>ພັກບິນ (Park Bill)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>ຊື່ອ້າງອີງ (Reference Name)</Form.Label>
            <Form.Control
              type="text"
              placeholder="ຕົວຢ່າງ: ລູກຄ້າເສື້ອແດງ, ໂຕະ 5"
              value={parkReferenceName}
              onChange={(e) => setParkReferenceName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleParkBill()}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowParkModal(false)}>
            ຍົກເລີກ
          </Button>
          <Button variant="primary" onClick={handleParkBill}>
            ຢືນຢັນການພັກບິນ
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Recall Bill Modal */}
      <Modal show={showRecallModal} onHide={() => setShowRecallModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>ລາຍການບິນທີ່ພັກໄວ້ (Recall Bill)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ListGroup>
            {parkedBills.length > 0 ? (
              parkedBills.map(bill => (
                <ListGroup.Item key={bill.id} action className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-bold">{bill.reference_name}</div>
                    <small className="text-muted">
                      ເວລາ: {bill.time} | ລູກຄ້າ: {bill.customer_search || 'ບໍ່ມີ'} | {bill.cart_data.length} ລາຍການ
                    </small>
                  </div>
                  <Button variant="success" onClick={() => handleRecallBill(bill)}>
                    ເອີ້ນບິນນີ້
                  </Button>
                </ListGroup.Item>
              ))
            ) : (
              <p className="text-center text-muted">ບໍ່ມີບິນທີ່ພັກໄວ້</p>
            )}
          </ListGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRecallModal(false)}>
            ປິດ
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Receipt Modal */}
      <Modal show={showReceiptModal} onHide={() => setShowReceiptModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>ໃບຮັບເງິນ (Receipt)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {receiptData && (
            <div>
              <p><strong>ເລກບິນ:</strong> {receiptData.doc_no}</p>
              <p><strong>ວັນທີ:</strong> {receiptData.doc_date}</p>
              <p><strong>ລູກຄ້າ:</strong> {receiptData.customer_name}</p>
              <hr />
              <h6>ລາຍການສິນຄ້າ:</h6>
              <ListGroup variant="flush">
                {receiptData.items.map((item: CartItem) => (
                  <ListGroup.Item key={item.item_code} className="d-flex justify-content-between">
                    <span>{item.item_name} x {item.qty}</span>
                    <span>{item.price.toLocaleString()} ₭</span>
                  </ListGroup.Item>
                ))}
              </ListGroup>
              <hr />
              <div className="d-flex justify-content-between fw-bold">
                <span>ລວມທັງໝົດ:</span>
                <span>{receiptData.total_amount.toLocaleString()} ₭</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>ເງິນທີ່ຮັບມາ:</span>
                <span>{receiptData.amount_received.toLocaleString()} ₭</span>
              </div>
              <div className="d-flex justify-content-between fw-bold text-success">
                <span>ເງິນທອນ:</span>
                <span>{receiptData.change_amount.toLocaleString()} ₭</span>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReceiptModal(false)}>
            ປິດ
          </Button>
          <Button variant="primary" onClick={() => {
            if (receiptData) {
              sessionStorage.setItem('currentReceipt', JSON.stringify(receiptData));
              window.open('/receipt-print', '_blank');
            }
          }}>
            ພິມ
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1 }}>
        <Toast onClose={() => setShowToast(false)} show={showToast} delay={3000} autohide bg={toastVariant}>
          <Toast.Body className={toastVariant === 'danger' ? 'text-white' : ''}>
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
};

export default POSPageFlask;