import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Form, Spinner, Alert, Nav, Modal, Toast, ToastContainer } from 'react-bootstrap';
import NavigationBar from './NavigationBar';
import { useNavigate } from 'react-router-dom';
import './POSPage.css';

const ITEMS_PER_PAGE = 30;

const DEFAULT_CUSTOMER_CODE = '01-0239';
const DEFAULT_CUSTOMER_NAME = 'ລູກຄ້າທີ່ຮ້ານ';
const WALK_IN_CUSTOMER_IDS = ['2012344321', '01-2125', '01-2127', '01-2126', '01-0239'];

// Interface for Product and CartItem
interface Product {
  item_code: string;
  item_name: string;
  price: number;
  image: string;
  url_image: string;
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

// Helper function to safely format numbers
const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null) {
    return '0';
  }
  return value.toLocaleString();
};

const POSPageFlask = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
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
      setProducts([]);
      setOffset(0);
      setHasMore(true);
      fetchProducts(0);
    }, 500);

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
  const [selectedCustomer, setSelectedCustomer] = useState<string>(DEFAULT_CUSTOMER_CODE);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('1301');
  const [selectedLocation, setSelectedLocation] = useState<string>('01');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [customerSearch, setCustomerSearch] = useState(`${DEFAULT_CUSTOMER_NAME} (${DEFAULT_CUSTOMER_CODE})`);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isWalkInMode, setIsWalkInMode] = useState(true); // New state to toggle between walk-in dropdown and search
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [change, setChange] = useState<number>(0);
  const [isCartExpanded, setIsCartExpanded] = useState<boolean>(true);
  const [isBilling, setIsBilling] = useState<boolean>(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');

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
        const response = await fetch(`${import.meta.env.VITE_FLASK_API_URL}/warehouse`);
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
        const response = await fetch(`${import.meta.env.VITE_FLASK_API_URL}/customer`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        let fetchedCustomers: Customer[] = data.list;

        const walkInCustomers = fetchedCustomers.filter(c => WALK_IN_CUSTOMER_IDS.includes(c.code));
        const otherCustomers = fetchedCustomers.filter(c => !WALK_IN_CUSTOMER_IDS.includes(c.code));

        // Ensure DEFAULT_CUSTOMER_CODE is first among walk-in customers
        walkInCustomers.sort((a, b) => {
          if (a.code === DEFAULT_CUSTOMER_CODE) return -1;
          if (b.code === DEFAULT_CUSTOMER_CODE) return 1;
          return 0;
        });

        // Combine them: walk-in customers first, then others
        const sortedCustomers = [...walkInCustomers, ...otherCustomers];

        setCustomers(sortedCustomers);
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
        const response = await fetch(`${import.meta.env.VITE_FLASK_API_URL}/location/${selectedWarehouse}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setLocations(data.list);
        
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
    setChange(Math.max(0, amountReceived - total));
  }, [amountReceived, total]);

  const fetchProducts = useCallback(async (currentOffset: number) => {
    if (currentOffset === 0) {
      setLoading(true);
      setProducts([]); // Clear products when starting a new fetch
    } else {
      setLoadingMore(true);
    }
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

      const response = await fetch(`${import.meta.env.VITE_FLASK_API_URL}/product?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      const formattedProducts = data.list.map((p: any) => ({
        item_code: p.item_code,
        item_name: p.item_name,
        price: parseFloat(p.price) || 0,
        image: p.image,
        url_image: p.url_image || '',
        stock_quantity: parseInt(p.stock_quantity, 10) || 0,
        unit_code: p.unit_code,
        qty: 1
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
      const response = await fetch(`${import.meta.env.VITE_FLASK_API_URL}/category?whcode=${selectedWarehouse}&loccode=${selectedLocation}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
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

    setIsBilling(true);
    try {
      const docNoResponse = await fetch(`${import.meta.env.VITE_FLASK_API_URL}/docno`);
      if (!docNoResponse.ok) {
        throw new Error('Failed to fetch document number.');
      }
      const docNoData = await docNoResponse.json();
      const docNo = docNoData.docno;

      if (!docNo) {
        throw new Error('Invalid document number received from backend.');
      }

      const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
      const userCode = loggedInUser.code || 'SYSTEM';
      const userWhCode = loggedInUser.ic_wht || selectedWarehouse;
      const userShelfCode = loggedInUser.ic_shelf || selectedLocation;
      const userBranchCode = loggedInUser.ic_branch || '00';

      const billingData = {
        doc_no: docNo,
        doc_date: new Date().toISOString().split('T')[0],
        customer_code: selectedCustomer,
        total_amount: total,
        payment_method: paymentMethod,
        items: cart.map(item => ({
          ...item,
          amount: item.price * item.qty
        })),
        user_code: userCode,
        wh_code: userWhCode,
        shelf_code: userShelfCode,
        branch_code: userBranchCode,
      };

      const billingResponse = await fetch(`${import.meta.env.VITE_FLASK_API_URL}/posbilling`, {
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

      const newReceipt = {
        doc_no: result.doc_no,
        doc_date: new Date().toString(),
        customer_name: customers.find(c => c.code === selectedCustomer)?.name || selectedCustomer,
        total_amount: total,
        amount_received: amountReceived,
        change_amount: change,
        payment_method: paymentMethod,
        items: cart.map(item => ({
          item_code: item.item_code,
          item_name: item.item_name,
          price: item.price,
          qty: item.qty
        })),
      };
      

      setReceiptData(newReceipt);
      setShowReceiptModal(true);

      const savedReceipts = JSON.parse(localStorage.getItem('posReceiptsFlask') || '[]');
      localStorage.setItem('posReceiptsFlask', JSON.stringify([newReceipt, ...savedReceipts]));

      showCustomToast(`ບິນໄດ້ຖືກບັນທຶກສຳເລັດ! ເລກບິນ: ${result.doc_no}`);
      
      setCart([]);
      setAmountReceived(0);
      setChange(0);
      setCustomerSearch('');
      setSelectedCustomer('');

    } catch (error: any) {
      console.error('Billing process failed:', error);
      let errorMessage = 'ເກີດຂໍ້ຜິດພາດໃນການສ້າງບິນ';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response && error.response.json) {
        const errorJson = await error.response.json();
        if (errorJson.error) {
          errorMessage = errorJson.error;
        }
      }
      showCustomToast(errorMessage, 'danger');
    } finally {
      setIsBilling(false);
    }
  };

  const getImageUrl = (product: Product) => {
    const imageBaseUrl = 'https://www.odienmall.com/static/image/product/';
    if (product.url_image && product.url_image.trim() !== '') {
      if (product.url_image.startsWith('http')) {
        return product.url_image;
      }
      return `${imageBaseUrl}${product.url_image}`;
    }
    return product.image || '/image/exam.jpg';
  };

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
    if (!parkReferenceName || parkReferenceName.trim() === '') {
      showCustomToast('ກະລຸນາປ້ອນຊື່ອ້າງອີງ ຫຼື ເລືອກລູກຄ້າກ່ອນ.', 'warning');
      return;
    }

    try {
      const newParkedBill = {
        id: Date.now(),
        reference_name: parkReferenceName,
        cart_data: cart,
        customer_code: selectedCustomer,
        customer_search: customerSearch,
        time: new Date().toString(),
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
    setCart(bill.cart_data || []);
    setSelectedCustomer(bill.customer_code || '');
    setCustomerSearch(bill.customer_search || '');

    try {
      const savedParkedBills = JSON.parse(localStorage.getItem('posParkedBillsFlask') || '[]');
      const updatedParkedBills = savedParkedBills.filter((pb: any) => pb.id !== bill.id);
      localStorage.setItem('posParkedBillsFlask', JSON.stringify(updatedParkedBills));
      setParkedBills(updatedParkedBills);
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
              variant="warning" 
              className="mb-2 w-100 d-flex flex-column align-items-center justify-content-center"
              style={{ height: '80px' }}
              onClick={() => navigate('/sales-history')}
            >
              <i className="bi bi-clock-history fs-4"></i>
              <span style={{ fontSize: '0.75rem' }}>ປະຫວັດ</span>
            </Button>
          </Col>

          {/* Product Selection */}
          <Col md={7}>
            <Card className="h-100">
              <Card.Header>
                <Row className="align-items-center">
                    <Col xs={12} sm={5} className="mb-2 mb-sm-0">
                        <h4 className="mb-0">
                          <i className="bi bi-basket me-2"></i>
                          ເລືອກສິນຄ້າ
                        </h4>
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
                      <Form.Label>
                        <i className="bi bi-building me-1"></i>
                        ສາງ:
                      </Form.Label>
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
                      <Form.Label>
                        <i className="bi bi-geo-alt me-1"></i>
                        ບ່ອນເກັບ:
                      </Form.Label>
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
                <div className="p-2 border-bottom category-header-sticky">
                  <Row className="align-items-center mb-1">
                    <Col xs={5}>
                      <p className="mb-0 fw-bold" style={{ fontSize: '0.9rem' }}>
                        <i className="bi bi-tags me-1"></i>
                        ໝວດໝູ່:
                      </p>
                    </Col>
                    <Col xs={7}>
                      <Form.Control
                        type="text"
                        placeholder="ຄົ້ນຫາໝວດໝູ່..."
                        value={categorySearchTerm}
                        onChange={(e) => setCategorySearchTerm(e.target.value)}
                        size="sm"
                        style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                      />
                    </Col>
                  </Row>
                  {categoriesError && <Alert variant="warning" className="p-2" style={{ fontSize: '0.8rem' }}>ບໍ່ສາມາດໂຫລດໝວດໝູ່ໄດ້.</Alert>}
                  <div className="category-tabs-container" ref={categoryTabsRef}>
                    <Nav variant="pills" className="category-tabs flex-nowrap overflow-auto">
                      {categories
                        .filter(category => 
                          category.name.toLowerCase().includes(categorySearchTerm.toLowerCase())
                        )
                        .map((category, idx) => (
                        <Nav.Item key={idx} className="me-1 mb-1">
                          <Nav.Link
                            eventKey={category.name}
                            active={selectedCategory === category.name}
                            onClick={() => setSelectedCategory(category.name)}
                            className={`category-tab ${selectedCategory === category.name ? "active" : ""}`}
                            style={{ fontSize: '0.8rem' }}
                          >
                            <span className="category-name">{category.name}</span>
                            <span className="category-count badge bg-secondary ms-1">{category.count}</span>
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
                    {products.map((product, index) => (
                      <Card key={`${product.item_code}-${index}`} className="product-card" onClick={() => addToCart(product)}>
                        {product.stock_quantity <= 5 && (
                          <span className={`badge-stock ${product.stock_quantity <= 2 ? 'badge-low-stock' : ''}`}>
                            <i className="bi bi-exclamation-triangle-fill me-1"></i>
                            {product.stock_quantity}
                          </span>
                        )}
                        <Card.Img variant="top" src={getImageUrl(product)} className="product-image"/>
                        <Card.Body className="text-center">
                          <Card.Title as="div" className="product-name">{product.item_name}</Card.Title>
                          <Card.Text className="product-code">
                            <i className="bi bi-upc me-1"></i>
                            {product.item_code} ({product.unit_code})
                          </Card.Text>
                          <Card.Text className="product-price">
                            <i className="bi bi-cash me-1"></i>
                            {formatCurrency(product.price)} ₭
                          </Card.Text>
                          <Card.Text className={`product-stock ${product.stock_quantity <= 5 ? 'low' : ''}`}>
                            <i className="bi bi-box-seam me-1"></i>
                            <small>ຄົງເຫຼືອ: {product.stock_quantity}</small>
                          </Card.Text>
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
          <Col md={4}>
            {/* Customer Selection */}
            <Card className="mb-3">
              <Card.Header>
                <h5 className="mb-0">
                  <i className="bi bi-person-lines-fill me-2"></i>
                  ຂໍ້ມູນລູກຄ້າ
                </h5>
              </Card.Header>
              <Card.Body>
                <div className="customer-search-wrapper">
                  <div className="d-flex">
                    {isWalkInMode ? (
                      <Form.Select
                        value={selectedCustomer}
                        onChange={(e) => {
                          const selectedCode = e.target.value;
                          setSelectedCustomer(selectedCode);
                          const customer = customers.find(c => c.code === selectedCode);
                          setCustomerSearch(customer ? `${customer.name} (${customer.code})` : `${DEFAULT_CUSTOMER_NAME} (${DEFAULT_CUSTOMER_CODE})`);
                        }}
                        className="flex-grow-1"
                      >
                        {customers
                          .filter(c => WALK_IN_CUSTOMER_IDS.includes(c.code))
                          .map(customer => (
                            <option key={customer.code} value={customer.code}>
                              {customer.name} ({customer.code})
                            </option>
                          ))}
                      </Form.Select>
                    ) : (
                      <Form.Control
                        type="text"
                        placeholder="ຄົ້ນຫາດ້ວຍລະຫັດ ຫຼື ຊື່ລູກຄ້າ..."
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setIsCustomerDropdownOpen(true);
                          if (e.target.value !== DEFAULT_CUSTOMER_NAME) {
                            setSelectedCustomer('');
                          }
                        }}
                        onFocus={() => setIsCustomerDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setIsCustomerDropdownOpen(false), 200)}
                        className="flex-grow-1"
                      />
                    )}
                    <Button
                      variant="outline-secondary"
                      onClick={() => {
                        if (isWalkInMode) {
                          // Switch to search mode
                          setIsWalkInMode(false);
                          setCustomerSearch('');
                          setSelectedCustomer('');
                          setIsCustomerDropdownOpen(true);
                        } else {
                          // Switch back to walk-in mode
                          setIsWalkInMode(true);
                          setSelectedCustomer(DEFAULT_CUSTOMER_CODE);
                          setCustomerSearch(`${DEFAULT_CUSTOMER_NAME} (${DEFAULT_CUSTOMER_CODE})`);
                          setIsCustomerDropdownOpen(false);
                        }
                      }}
                      className="ms-2"
                      title={isWalkInMode ? "ຄົ້ນຫາລູກຄ້າອື່ນ" : "ເລືອກລູກຄ້າໜ້າຮ້ານ"}
                    >
                      {isWalkInMode ? <i className="bi bi-search"></i> : <i className="bi bi-person-fill"></i>}
                    </Button>
                  </div>
                  {!isWalkInMode && isCustomerDropdownOpen && (
                    <div className="customer-search-results">
                      {customers
                        .filter(c =>
                          !WALK_IN_CUSTOMER_IDS.includes(c.code) && // Exclude walk-in customers from search results
                          (c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                           c.code.toLowerCase().includes(customerSearch.toLowerCase()))
                        )
                        .slice(0, 50)
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
                            <div className="d-flex align-items-center">
                              <i className="bi bi-person-circle me-2"></i>
                              <div>
                                <div className="fw-bold">{customer.name}</div>
                                <small className="text-muted">ID: {customer.code}</small>
                              </div>
                            </div>
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
                <h4 className="mb-0">
                  <i className="bi bi-cart-check me-2"></i>
                  ກະຕ່າສິນຄ້າ
                </h4>
              </Card.Header>
              <div className="p-3 border-bottom">
                <div className="action-buttons">
                  <Button 
                    variant="success" 
                    disabled={cart.length === 0 || !selectedCustomer || isBilling} 
                    onClick={processBilling}
                    title="Process payment for items in cart"
                  >
                    <i className="bi bi-cash-coin"></i>
                    ຊຳລະເງິນ
                  </Button>
                  <Button 
                    variant="info" 
                    disabled={cart.length === 0} 
                    onClick={() => {
                      setParkReferenceName(customerSearch); // Pre-fill with current customer
                      setShowParkModal(true);
                    }}
                    title="Park this bill for later"
                  >
                    <i className="bi bi-pause-circle"></i>
                    ພັກບິນ
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={handleShowRecallModal}
                    title="Recall a parked bill"
                  >
                    <i className="bi bi-arrow-counterclockwise"></i>
                    ເອີ້ນບິນ
                  </Button>
                  <Button 
                    variant="danger" 
                    onClick={() => {
                      setCart([]);
                      setSelectedCustomer('');
                      setCustomerSearch('');
                    }}
                    title="Clear cart and customer selection"
                  >
                    <i className="bi bi-x-circle"></i>
                    ຍົກເລີກ
                  </Button>
                </div>
                
                {/* Payment Method Selection */}
                <Form.Group className="my-3">
                  <Form.Label className="fw-bold">
                    <i className="bi bi-credit-card me-1"></i>
                    ວິທີຊຳລະເງິນ:
                  </Form.Label>
                  <Form.Select 
                    value={paymentMethod} 
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="cash">
                      ເງິນສົດ (Cash)
                    </option>
                    <option value="transfer">
                      ໂອນຈ່າຍ (Transfer)
                    </option>
                  </Form.Select>
                </Form.Group>
              </div>
              
              <Card.Body className="d-flex flex-column">
                <ListGroup variant="flush" className="flex-grow-1 cart-items-scrollable">
                  {isCartExpanded ? (
                    cart.map(item => (
                      <ListGroup.Item key={item.item_code} className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-bold">{item.item_name}</div>
                          <div>
                            <i className="bi bi-cash me-1"></i>
                            {formatCurrency(item.price)} ₭
                          </div>
                        </div>
                        <div className="d-flex align-items-center">
                          <Button variant="outline-secondary" size="sm" onClick={() => updateQuantity(item.item_code, item.qty - 1)}>
                            <i className="bi bi-dash"></i>
                          </Button>
                          <span className="mx-2 fw-bold">{item.qty}</span>
                          <Button variant="outline-secondary" size="sm" onClick={() => updateQuantity(item.item_code, item.qty + 1)}>
                            <i className="bi bi-plus"></i>
                          </Button>
                        </div>
                      </ListGroup.Item>
                    ))
                  ) : (
                    <p className="text-center text-muted mt-3">
                      {cart.length === 0 ? (
                        <>
                          <i className="bi bi-cart-x fs-1 d-block mb-2"></i>
                          ຍັງບໍ່ມີສິນຄ້າໃນກະຕ່າ
                        </>
                      ) : (
                        <>
                          <i className="bi bi-cart fs-1 d-block mb-2"></i>
                          {cart.length} ລາຍການໃນກະຕ່າ
                        </>
                      )}
                    </p>
                  )}
                </ListGroup>
                <div className="text-center mt-2">
                  {cart.length > 0 && (
                    <Button variant="link" onClick={() => setIsCartExpanded(!isCartExpanded)}>
                      {isCartExpanded ? (
                        <>
                          <i className="bi bi-chevron-up me-1"></i>
                          ຍຸບລາຍການ
                        </>
                      ) : (
                        <>
                          <i className="bi bi-chevron-down me-1"></i>
                          ຂະຫຍາຍລາຍການ
                        </>
                      )}
                    </Button>
                  )}
                </div>
                
                <div className="mt-auto">
                  <div className="payment-summary">
                    <div className="summary-item">
                      <span>
                        <i className="bi bi-receipt me-1"></i>
                        ຈຳນວນລາຍການ:
                      </span>
                      <span className="fw-bold">{cart.reduce((sum, item) => sum + item.qty, 0)}</span>
                    </div>
                    <div className="summary-item total">
                      <span className="text-success">
                        <i className="bi bi-receipt me-1"></i>
                        ລວມເປັນງິນທັງໝົດ:
                      </span>
                      <span className="fw-bold fs-5 text-success">{formatCurrency(total)} ₭</span>
                    </div>
                    <div className="summary-item">
                      <span>
                        <i className="bi bi-wallet2 me-1"></i>
                        <span className="fw-bold">ເງິນທີ່ຮັບມາ:</span>
                      </span>
                      <span>
                        <div className="d-flex align-items-center">
                          <Form.Control
                            type="number"
                            placeholder="0"
                            value={amountReceived === 0 ? '' : amountReceived}
                            onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                            min="0"
                            className="d-inline-block w-auto me-2"
                          />
                          <Button 
                            variant="primary" 
                            size="sm" 
                            onClick={() => setAmountReceived(total)}
                            title="เติมยอดรวม"
                          >
                            ລວມເປັນເງິນ
                          </Button>
                        </div>
                      </span>
                    </div>
                    <div className="summary-item total">
                      <span>
                        <i className="bi bi-cash-stack me-1"></i>
                        ເງິນທອນ:
                      </span>
                      <span className="fs-5">{formatCurrency(change)} ₭</span>
                    </div>
                  </div>
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
          <Modal.Title>
            <i className="bi bi-pause-circle me-2"></i>
            ພັກບິນ (Park Bill)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>
              <i className="bi bi-tag me-1"></i>
              ຊື່ອ້າງອີງ (Reference Name)
            </Form.Label>
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
            <i className="bi bi-x-circle me-1"></i>
            ຍົກເລີກ
          </Button>
          <Button variant="primary" onClick={handleParkBill}>
            <i className="bi bi-check-circle me-1"></i>
            ຢືນຢັນການພັກບິນ
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Recall Bill Modal */}
      <Modal show={showRecallModal} onHide={() => setShowRecallModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-arrow-counterclockwise me-2"></i>
            ລາຍການບິນທີ່ພັກໄວ້ (Recall Bill)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ListGroup>
            {parkedBills.length > 0 ? (
              parkedBills.map(bill => (
                <ListGroup.Item key={bill.id} action className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-bold">
                      <i className="bi bi-tag me-1"></i>
                      {bill.reference_name}
                    </div>
                    <small className="text-muted">
                      <i className="bi bi-clock me-1"></i>
                      ເວລາ: {bill.time} | 
                      <i className="bi bi-person me-1 ms-2"></i>
                      ລູກຄ້າ: {bill.customer_search || 'ບໍ່ມີ'} | 
                      <i className="bi bi-list-task me-1 ms-2"></i>
                      {bill.cart_data.length} ລາຍການ
                    </small>
                  </div>
                  <Button variant="success" onClick={() => handleRecallBill(bill)}>
                    <i className="bi bi-arrow-counterclockwise me-1"></i>
                    ເອີ້ນບິນນີ້
                  </Button>
                </ListGroup.Item>
              ))
            ) : (
              <p className="text-center text-muted">
                <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                ບໍ່ມີບິນທີ່ພັກໄວ້
              </p>
            )}
          </ListGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRecallModal(false)}>
            <i className="bi bi-x-circle me-1"></i>
            ປິດ
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Receipt Modal */}
      <Modal show={showReceiptModal} onHide={() => setShowReceiptModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-receipt me-2"></i>
            ໃບຮັບເງິນ (Receipt)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {receiptData && (
            <div>
              <div className="text-center mb-4">
                <h5 className="fw-bold">ODIEN MALL</h5>
                <p className="text-muted">ໃບຮັບເງິນ / RECEIPT</p>
              </div>
              
              <div className="d-flex justify-content-between mb-3">
                <div>
                  <p className="mb-1">
                    <i className="bi bi-hash me-1"></i>
                    <strong>ເລກບິນ:</strong> {receiptData.doc_no}
                  </p>
                  <p className="mb-1">
                    <i className="bi bi-calendar me-1"></i>
                    <strong>ວັນທີ:</strong> {receiptData.doc_date}
                  </p>
                </div>
                <div>
                  <p className="mb-1">
                    <i className="bi bi-person me-1"></i>
                    <strong>ລູກຄ້າ:</strong> {receiptData.customer_name}
                  </p>
                  <p className="mb-1">
                    <i className="bi bi-credit-card me-1"></i>
                    <strong>ຊຳລະຜ່ານ:</strong> {receiptData.payment_method === 'cash' ? 'ເງິນສົດ' : receiptData.payment_method === 'transfer' ? 'ໂອນຈ່າຍ' : 'ບັດເຄຣດິດ'}
                  </p>
                </div>
              </div>
              
              <hr />
              
              <h6>
                <i className="bi bi-list-check me-1"></i>
                ລາຍການສິນຄ້າ:
              </h6>
              
              <ListGroup variant="flush" className="mb-3">
                {receiptData.items.map((item: CartItem) => (
                  <ListGroup.Item key={item.item_code} className="d-flex justify-content-between">
                    <div>
                      <span>{item.item_name} x {item.qty}</span>
                    </div>
                    <span>{formatCurrency((item.price || 0) * (item.qty || 0))} ₭</span>
                  </ListGroup.Item>
                ))}
              </ListGroup>
              
              <div className="payment-summary">
                <div className="summary-item">
                  <span>ລວມທັງໝົດ:</span>
                  <span className="fw-bold">{formatCurrency(receiptData.total_amount)} ₭</span>
                </div>
                <div className="summary-item">
                  <span>ເງິນທີ່ຮັບມາ:</span>
                  <span>{formatCurrency(receiptData.amount_received)} ₭</span>
                </div>
                <div className="summary-item total">
                  <span>ເງິນທອນ:</span>
                  <span>{formatCurrency(receiptData.change_amount)} ₭</span>
                </div>
              </div>
              
              <div className="text-center mt-4 text-muted">
                <small>ຂອບໃຈສຳລັບການຊື້ຂາຍຂອງທ່ານ!</small>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReceiptModal(false)}>
            <i className="bi bi-x-circle me-1"></i>
            ປິດ
          </Button>
          <Button variant="primary" onClick={() => {
            if (receiptData) {
              sessionStorage.setItem('currentReceipt', JSON.stringify(receiptData));
              window.open('/receipt-print', '_blank');
            }
          }}>
            <i className="bi bi-printer me-1"></i>
            ພິມ
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1 }}>
        <Toast onClose={() => setShowToast(false)} show={showToast} delay={3000} autohide bg={toastVariant}>
          <Toast.Body className={toastVariant === 'danger' ? 'text-white' : ''}>
            <div className="d-flex align-items-center">
              <i className={`bi ${toastVariant === 'success' ? 'bi-check-circle' : toastVariant === 'warning' ? 'bi-exclamation-triangle' : 'bi-x-circle'} me-2`}></i>
              {toastMessage}
            </div>
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
};

export default POSPageFlask;