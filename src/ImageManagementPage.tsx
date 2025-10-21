import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner, Alert, Nav, ListGroup, Toast, ToastContainer, Modal } from 'react-bootstrap';
import './ImageManagementPage.css';

const API_URL = import.meta.env.VITE_FLASK_API_URL;

// Placeholder for loggedInUser - replace with actual context/prop later
const loggedInUser = { code: 'SYSTEM_USER' };

// Interfaces
interface Product {
  item_code: string;
  item_name: string;
  price: number;
  url_image: string;
  stock_quantity: number;
  unit_code: string;
}

interface Category {
  name: string;
  count: number;
}

interface ImageHistoryRecord {
  id: number;
  item_code: string;
  old_url_image: string | null;
  new_url_image: string;
  changed_by: string;
  change_timestamp: string;
  action_type: 'UPDATE' | 'REVERT';
  item_name?: string; // Add optional product name
}

const ImageManagementPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const LIMIT = 50;

  // Filter states
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('1301');
  const [selectedLocation, setSelectedLocation] = useState<string>('01');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // Search debounce
  const debouncedSearchTerm = useRef<string>('');

  // Item update states
  const [updatingItems, setUpdatingItems] = useState<Record<string, boolean>>({});
  const [uploadingItems, setUploadingItems] = useState<Record<string, boolean>>({}); // New state for uploads
  const [newImageUrls, setNewImageUrls] = useState<Record<string, string>>({});

  // Toast states
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');

  // History Modal states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showGlobalHistoryModal, setShowGlobalHistoryModal] = useState(false);
  const [currentProductForHistory, setCurrentProductForHistory] = useState<Product | null>(null);
  const [historyData, setHistoryData] = useState<ImageHistoryRecord[]>([]);
  const [globalHistoryData, setGlobalHistoryData] = useState<ImageHistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingGlobalHistory, setLoadingGlobalHistory] = useState(false);
  const [globalHistoryCount, setGlobalHistoryCount] = useState<number>(0); 

  const [globalNewImageUrls, setGlobalNewImageUrls] = useState<Record<string, string>>({});

  const [globalHistoryFilter, setGlobalHistoryFilter] = useState({
    searchTerm: '',
    startDate: '',
    endDate: ''
  });

  // --- Intersection Observer for Infinite Scroll ---
  const observer = useRef<IntersectionObserver>();
  const lastProductElementRef = useCallback((node: HTMLAnchorElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setOffset(prevOffset => prevOffset + LIMIT);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  const showCustomToast = (message: string, variant: string = 'success') => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };

  // --- DATA FETCHING --- //

  const fetchWarehouses = async () => {
    try {
      const response = await fetch(`${API_URL}/warehouse`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setWarehouses(data.list);
    } catch (e) {
      console.error("Failed to fetch warehouses:", e);
    }
  };

  const fetchLocations = async (whcode: string) => {
    try {
      const response = await fetch(`${API_URL}/location/${whcode}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setLocations(data.list);
      if (data.list && data.list.length > 0) {
        setSelectedLocation(data.list[0].code);
      }
    } catch (e) {
      console.error("Failed to fetch locations:", e);
    }
  };

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/category?whcode=${selectedWarehouse}&loccode=${selectedLocation}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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

  const fetchProducts = useCallback(async (currentOffset: number) => {
    const isInitialLoad = currentOffset === 0;
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        whcode: selectedWarehouse,
        loccode: selectedLocation,
        search: debouncedSearchTerm.current,
        limit: String(LIMIT),
        offset: String(currentOffset),
        image_status: 'missing'
      });
      
      if (selectedCategory !== 'All') {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`${API_URL}/product?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const newProducts = data.list || [];

      setProducts(prev => isInitialLoad ? newProducts : [...prev, ...newProducts]);
      setHasMore(newProducts.length === LIMIT);

    } catch (e: any) {
      setError(e.message);
      showCustomToast('ເກີດຂໍ້ຜິດພາດໃນການໂຫຼດຂໍ້ມູນສິນຄ້າ', 'danger');
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [selectedWarehouse, selectedLocation, selectedCategory]);

  // --- USE EFFECTS --- //

  useEffect(() => {
    fetchWarehouses();
    fetchGlobalHistoryCount();
  }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      fetchLocations(selectedWarehouse);
    }
  }, [selectedWarehouse]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Effect for fetching products based on offset
  useEffect(() => {
    fetchProducts(offset);
  }, [offset, fetchProducts]);

  // Effect for resetting products on filter change
  useEffect(() => {
    setProducts([]);
    setOffset(0);
    setHasMore(true);
    // The actual fetch is triggered by the offset change
  }, [selectedCategory, selectedWarehouse, selectedLocation, debouncedSearchTerm.current]);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
        if (searchTerm !== debouncedSearchTerm.current) {
            debouncedSearchTerm.current = searchTerm;
            setProducts([]);
            setOffset(0);
            setHasMore(true);
            // The fetch will be triggered by the offset state change in the above useEffect
        }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);


  const fetchGlobalHistoryCount = async () => {
    try {
      const response = await fetch(`${API_URL}/product/image-history-all?limit=1`);
      if (response.ok) {
        const data = await response.json();
        setGlobalHistoryCount(data.total_count || 0);
      }
    } catch (e) {
      console.error("Failed to fetch global history count:", e);
    }
  };

  // --- HANDLERS --- //

  const handleFileUpload = async (itemCode: string, file: File) => {
    if (!file) return;

    setUploadingItems(prev => ({ ...prev, [itemCode]: true }));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('item_code', itemCode); // Add item_code to the form data

    try {
      const response = await fetch(`${API_URL}/product/upload-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const result = await response.json();
      if (result.success && result.url) {
        setNewImageUrls(prev => ({ ...prev, [itemCode]: result.url }));
        showCustomToast('ອັບໂຫລດໄຟລ໌ສຳເລັດ! ກະລຸນາກົດບັນທຶກ.', 'info');
      } else {
        throw new Error(result.error || 'Upload completed but no URL was returned.');
      }

    } catch (e: any) {
      console.error('File upload error:', e);
      showCustomToast(`ເກີດຂໍ້ຜິດພາດໃນການອັບໂຫລດ: ${e.message}`, 'danger');
    } finally {
      setUploadingItems(prev => ({ ...prev, [itemCode]: false }));
    }
  };

  const handleSaveImage = async (itemCode: string) => {
    const url = newImageUrls[itemCode];
    if (!url || url.trim() === '') {
      showCustomToast('ກະລຸນາໃສ່ URL ຂອງຮູບພາບກ່ອນ', 'warning');
      return;
    }

    setUpdatingItems(prev => ({ ...prev, [itemCode]: true }));

    try {
      const response = await fetch(`${API_URL}/product/update-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          item_code: itemCode, 
          new_image_url: url, 
          changed_by: loggedInUser.code // Add user code
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update image');
      }

      showCustomToast('ບັນທຶກຮູບພາບສຳເລັດ!', 'success');

      // Remove the product from the list
      setProducts(prevProducts => prevProducts.filter(p => p.item_code !== itemCode));
      setNewImageUrls(prev => {
        const newUrls = { ...prev };
        delete newUrls[itemCode];
        return newUrls;
      });

    } catch (e: any) {
      console.error('Save image error:', e);
      showCustomToast(`ເກີດຂໍ້ຜິດພາດ: ${e.message}`, 'danger');
    } finally {
      setUpdatingItems(prev => ({ ...prev, [itemCode]: false }));
    }
  };

  const handleShowHistory = async (product: Product) => {
    setCurrentProductForHistory(product);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const response = await fetch(`${API_URL}/product/image-history/${product.item_code}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setHistoryData(data.history || []);
    } catch (e: any) {
      console.error("Failed to fetch history:", e);
      showCustomToast(`ເກີດຂໍ້ຜິດພາດໃນການໂຫຼດປະຫວັດ: ${e.message}`, 'danger');
      setHistoryData([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleShowGlobalHistory = async () => {
    setShowGlobalHistoryModal(true);
    setLoadingGlobalHistory(true);
    try {
      // Add filtering parameters
      const params = new URLSearchParams({
        limit: '100'
      });
      
      if (globalHistoryFilter.searchTerm) {
        params.append('search', globalHistoryFilter.searchTerm);
      }
      
      if (globalHistoryFilter.startDate) {
        params.append('start_date', globalHistoryFilter.startDate);
      }
      
      if (globalHistoryFilter.endDate) {
        params.append('end_date', globalHistoryFilter.endDate);
      }

      const response = await fetch(`${API_URL}/product/image-history-all?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setGlobalHistoryData(data.history || []);
      
      // Use unique product count from backend instead of calculating it frontend
      setGlobalHistoryCount(data.unique_product_count || 0);
    } catch (e: any) {
      console.error("Failed to fetch global history:", e);
      showCustomToast(`ເກີດຂໍ້ຜິດພາດໃນການໂຫຼດປະຫວັດທັງໝົດ: ${e.message}`, 'danger');
      setGlobalHistoryData([]);
    } finally {
      setLoadingGlobalHistory(false);
    }
  };

  // New function to handle global image update
  const handleUpdateImageGlobal = async (itemCode: string, newImageUrl: string) => {
    if (!newImageUrl || newImageUrl.trim() === '') {
      showCustomToast('ກະລຸນາໃສ່ URL ຂອງຮູບພາບກ່ອນ', 'warning');
      return;
    }

    // Removed revert functionality as it was not working as intended

    try {
      const response = await fetch(`${API_URL}/product/update-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          item_code: itemCode, 
          new_image_url: newImageUrl, 
          changed_by: loggedInUser.code
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update image');
      }

      showCustomToast(`ອັບເດດຮູບພາບສຳລັບ ${itemCode} ສຳເລັດ!`, 'success');
      
      // Refresh global history and main product list
      await handleShowGlobalHistory();
      fetchProducts(0); // Pass the initial offset value

      // Clear the input field
      setGlobalNewImageUrls(prev => {
        const newUrls = { ...prev };
        delete newUrls[itemCode];
        return newUrls;
      });

    } catch (e: any) {
      console.error('Update image error:', e);
      showCustomToast(`ເກີດຂໍ້ຜິດພາດໃນການອັບເດດ: ${e.message}`, 'danger');
    } finally {
      // Removed revert functionality as it was not working as intended
    }
  };

  return (
    <>
      <Container fluid className="mt-4">
        <Card>
          <Card.Header>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h4 className="mb-0">
                  <i className="bi bi-images me-2"></i>
                  ຈັດການຮູບພາບສິນຄ້າ
                </h4>
                <p className="mb-0 text-muted">
                  ໜ້ານີ້ຈະສະແດງສະເພາະສິນຄ້າທີ່ຍັງບໍ່ມີຮູບພາບໃນລະບົບ
                </p>
              </div>
              <Button 
                variant="outline-info"
                onClick={handleShowGlobalHistory}
                className="global-history-btn"
              >
                <i className="bi bi-clock-history me-1"></i> ປະຫວັດການແກ້ໄຂທັງໝົດ
                {globalHistoryCount > 0 && (
                  <span className="badge bg-danger ms-2">{globalHistoryCount}</span>
                )}
              </Button>
            </div>
          </Card.Header>
          
          {/* Filter Section */}
          <Card.Body className="border-bottom">
            <h5 className="mb-3">
                <i className="bi bi-filter-circle me-2"></i>
                ຕົວກອງ
            </h5>
            <Row>
              <Col md={4} className="mb-3">
                <Form.Group>
                  <Form.Label>ຄົ້ນຫາສິນຄ້າ</Form.Label>
                  <Form.Control
                      type="text"
                      placeholder="ຄົ້ນຫາດ້ວຍຊື່ ຫຼື ລະຫັດສິນຄ້າ..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={4} className="mb-3">
                <Form.Group>
                  <Form.Label>ສາງ (Warehouse)</Form.Label>
                  <Form.Select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)}>
                    {warehouses.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4} className="mb-3">
                <Form.Group>
                  <Form.Label>ບ່ອນເກັບ (Location)</Form.Label>
                  <Form.Select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
                    {locations.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            {/* Category Filter */}
            <div className="category-tabs-wrapper mt-2">
                <div className="p-2 border-top category-header-sticky">
                  <Row className="align-items-center mb-1">
                    <Col xs={5}><p className="mb-0 fw-bold">ໝວດໝູ່:</p></Col>
                    <Col xs={7}>
                      <Form.Control
                        type="text"
                        placeholder="ຄົ້ນຫາໝວດໝູ່..."
                        value={categorySearchTerm}
                        onChange={(e) => setCategorySearchTerm(e.target.value)}
                        size="sm"
                      />
                    </Col>
                  </Row>
                  {categoriesError && <Alert variant="warning">ບໍ່ສາມາດໂຫຼດໝວດໝູ່ໄດ້</Alert>}
                  <div className="category-tabs-container">
                    <Nav variant="pills" className="category-tabs flex-nowrap overflow-auto">
                      {categories
                        .filter(cat => cat.name.toLowerCase().includes(categorySearchTerm.toLowerCase()))
                        .map((cat, idx) => (
                        <Nav.Item key={idx} className="me-1 mb-1">
                          <Nav.Link
                            active={selectedCategory === cat.name}
                            onClick={() => setSelectedCategory(cat.name)}
                            className={`category-tab ${selectedCategory === cat.name ? "active" : ""}`}>
                            <span className="category-name">{cat.name}</span>
                            <span className="category-count badge bg-secondary ms-1">{cat.count}</span>
                          </Nav.Link>
                        </Nav.Item>
                      ))}
                    </Nav>
                  </div>
                </div>
              </div>
          </Card.Body>

          {/* Product List Section */}
          <Card.Body>
            {loading ? (
              <div className="text-center p-5">
                <Spinner animation="border" />
                <p className="mt-2">ກຳລັງໂຫຼດຂໍ້ມູນສິນຄ້າທີ່ຍັງບໍ່ມີຮູບພາບ...</p>
              </div>
            ) : error ? (
              <Alert variant="danger">{error}</Alert>
            ) : (
              <ListGroup variant="flush">
                {products.map((product, index) => (
                  <ListGroup.Item ref={products.length === index + 1 ? lastProductElementRef : null} key={product.item_code} className="px-0">
                    <Row className="align-items-center">
                      <Col xs={4} sm={2} md={1} className="text-center">
                        <img 
                          src={newImageUrls[product.item_code] || product.url_image || '/image/exam.jpg'} 
                          alt={product.item_name}
                          className="img-fluid rounded"
                          style={{ maxHeight: '60px', border: '1px solid #eee' }}
                          onError={(e) => (e.currentTarget.src = '/image/exam.jpg')}
                        />
                      </Col>
                      <Col xs={8} sm={4} md={4}>
                        <div className="fw-bold">{product.item_name}</div>
                        <small className="text-muted">{product.item_code}</small>
                      </Col>
                      <Col xs={12} sm={6} md={5} className="mt-2 mt-sm-0">
                        <div className="d-flex">
                          <Form.Control
                            type="text"
                            placeholder="ວາງ URL ຮູບພາບໃໝ່ທີ່ນີ້"
                            value={newImageUrls[product.item_code] || ''}
                            onChange={(e) => setNewImageUrls(prev => ({ ...prev, [product.item_code]: e.target.value }))}
                            className="me-2"
                          />
                          <Form.Group controlId={`formFile-${product.item_code}`} className="mb-0">
                             <Form.Label className="btn btn-success mb-0 d-flex align-items-center">
                               {uploadingItems[product.item_code] ? (
                                 <Spinner as="span" animation="border" size="sm" />
                               ) : (
                                 <i className="bi bi-upload"></i>
                               )}
                             </Form.Label>
                             <Form.Control 
                               type="file" 
                               accept="image/*"
                               style={{ display: 'none' }}
                               onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                 if (e.target.files && e.target.files[0]) {
                                   handleFileUpload(product.item_code, e.target.files[0]);
                                 }
                               }}
                               disabled={uploadingItems[product.item_code]}
                             />
                           </Form.Group>
                        </div>
                      </Col>
                      <Col xs={12} sm={12} md={2} className="text-end mt-2 mt-md-0">
                        <div className="d-flex flex-column">
                          <Button 
                            variant="primary"
                            disabled={!newImageUrls[product.item_code] || updatingItems[product.item_code] || uploadingItems[product.item_code]}
                            onClick={() => handleSaveImage(product.item_code)}
                            className="w-100"
                          >
                            {updatingItems[product.item_code] ? <Spinner as="span" animation="border" size="sm" /> : <><i className="bi bi-save me-1"></i> ບັນທຶກ</>}
                          </Button>
                          <Button 
                            variant="info"
                            onClick={() => handleShowHistory(product)}
                            className="w-100 mt-2"
                          >
                            <i className="bi bi-clock-history me-1"></i> ປະຫວັດ
                          </Button>

                        </div>
                      </Col>
                    </Row>
                  </ListGroup.Item>
                ))}
                
                {loadingMore && (
                  <div className="text-center p-4">
                    <Spinner animation="border" size="sm" />
                    <p className="mt-2 mb-0">ກຳລັງໂຫຼດເພີ່ມ...</p>
                  </div>
                )}

                {!hasMore && products.length > 0 && (
                  <div className="text-center text-muted p-4">
                    <p className="mb-0">ສິນຄ້າທັງໝົດຖືກສະແດງແລ້ວ</p>
                  </div>
                )}

                {products.length === 0 && !loading && (
                    <div className="text-center text-muted p-5">
                        <i className="bi bi-check-circle-fill fs-1 text-success"></i>
                        <h5 className="mt-2">ບໍ່ພົບສິນຄ້າທີ່ຍັງບໍ່ມີຮູບພາບ</h5>
                        <p>ຍອດຢ້ຽມ! ສິນຄ້າທັງໝົດຕາມເງື່ອນໄຂທີ່ເລືອກມີຮູບພາບຮຽບຮ້ອຍແລ້ວ</p>
                    </div>
                )}

              </ListGroup>
            )}
          </Card.Body>
        </Card>
      </Container>

      {/* History Modal */}
      <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>ປະຫວັດຮູບພາບ: {currentProductForHistory?.item_name} ({currentProductForHistory?.item_code})</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingHistory ? (
            <div className="text-center p-3">
              <Spinner animation="border" size="sm" /> ກຳລັງໂຫຼດປະຫວັດ...
            </div>
          ) : historyData.length === 0 ? (
            <Alert variant="info">ບໍ່ມີປະຫວັດການປ່ຽນແປງຮູບພາບສຳລັບສິນຄ້ານີ້.</Alert>
          ) : (
            <ListGroup variant="flush">
              {historyData.map(record => (
                <ListGroup.Item key={record.id} className="d-flex justify-content-between align-items-center history-item">
                  <div>
                    <small className="text-muted">ວັນທີ: {new Date(record.change_timestamp).toLocaleString()}</small><br/>
                    <small className="text-muted">ຜູ້ແກ້ໄຂ: {record.changed_by}</small><br/>
                    <small className="text-muted">ປະເພດ: {record.action_type}</small><br/>
                    <div className="d-flex align-items-center mt-2">
                      <img src={record.new_url_image || '/image/exam.jpg'} alt="New" style={{ width: '50px', height: '50px', objectFit: 'cover', marginRight: '10px', border: '1px solid #ddd' }} />
                      <span>{record.new_url_image}</span>
                    </div>
                  </div>
                  <div>
                    <small className="text-muted">ບໍ່ສາມາດຍ້ອນກັບໄດ້</small>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowHistoryModal(false)}>ປິດ</Button>
        </Modal.Footer>
      </Modal>

      {/* Global History Modal */}
      <Modal show={showGlobalHistoryModal} onHide={() => setShowGlobalHistoryModal(false)} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>ປະຫວັດການແກ້ໄນຮູບພາບທັງໝົດ</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Filter Section for Global History */}
          <div className="mb-3 p-3 border rounded">
            <Row>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>ຄົ້ນຫາສິນຄ້າ</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="ຄົ້ນຫາດ້ວຍຊື່ ຫຼື ລະຫັດສິນຄ້າ..."
                    value={globalHistoryFilter.searchTerm}
                    onChange={(e) => setGlobalHistoryFilter(prev => ({...prev, searchTerm: e.target.value}))}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>ວັນທີເລີ່ມຕົ້ນ</Form.Label>
                  <Form.Control
                    type="date"
                    value={globalHistoryFilter.startDate}
                    onChange={(e) => setGlobalHistoryFilter(prev => ({...prev, startDate: e.target.value}))}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>ວັນທີສິ້ນສຸດ</Form.Label>
                  <Form.Control
                    type="date"
                    value={globalHistoryFilter.endDate}
                    onChange={(e) => setGlobalHistoryFilter(prev => ({...prev, endDate: e.target.value}))}
                  />
                </Form.Group>
              </Col>
              <Col md={2} className="d-flex align-items-end">
                <Button 
                  variant="primary" 
                  onClick={handleShowGlobalHistory}
                  className="w-100"
                >
                  <i className="bi bi-search me-1"></i> ຄົ້ນຫາ
                </Button>
              </Col>
            </Row>
          </div>

          {loadingGlobalHistory ? (
            <div className="text-center p-3">
              <Spinner animation="border" size="sm" /> ກຳລັງໂຫຼດປະຫວັດທັງໝົດ...
            </div>
          ) : globalHistoryData.length === 0 ? (
            <Alert variant="info">ບໍ່ມີປະຫວັດການປ່ຽນແປງຮູບພາບ.</Alert>
          ) : (
            <div>
              <p className="text-muted">ຈຳນວນສິນຄ້າທີ່ແກ້ໄຂ: {globalHistoryCount}</p>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>ລະຫັດສິນຄ້າ</th>
                      <th>ຊື່ສິນຄ້າ</th>
                      <th>ຮູບພາບ</th>
                      <th>URL ຮູບພາບໃໝ່</th>
                      <th>ວັນທີ</th>
                      <th>ຜູ້ແກ້ໄຂ</th>
                      <th>ການກະຕິບ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {globalHistoryData.map(record => (
                      <tr key={record.id}>
                        <td>{record.item_code}</td>
                        <td>{record.item_name || '-'}</td>
                        <td>
                          <img 
                            src={record.new_url_image || '/image/exam.jpg'} 
                            alt="New" 
                            style={{ width: '50px', height: '50px', objectFit: 'cover', border: '1px solid #ddd' }} 
                          />
                        </td>
                        <td>
                          <Form.Control
                            type="text"
                            placeholder="URL ຮູບພາບໃໝ່"
                            value={globalNewImageUrls[record.item_code] || ''}
                            onChange={(e) => setGlobalNewImageUrls(prev => ({ ...prev, [record.item_code]: e.target.value }))}
                            size="sm"
                          />
                        </td>
                        <td>
                          <small className="text-muted">
                            {new Date(record.change_timestamp).toLocaleString()}
                          </small>
                        </td>
                        <td>{record.changed_by}</td>
                        <td>
                          <Button 
                            variant="primary" 
                            size="sm" 
                            onClick={() => handleUpdateImageGlobal(record.item_code, globalNewImageUrls[record.item_code] || '')}
                            disabled={!globalNewImageUrls[record.item_code]}
                          >
                            <><i className="bi bi-save me-1"></i> ບັນທຶກ</>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGlobalHistoryModal(false)}>ປິດ</Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast onClose={() => setShowToast(false)} show={showToast} delay={3000} autohide bg={toastVariant}>
          <Toast.Body className={toastVariant.includes('dark') || toastVariant.includes('danger') ? 'text-white' : ''}>
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
};

export default ImageManagementPage;
