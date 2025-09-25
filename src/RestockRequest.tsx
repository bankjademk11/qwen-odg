import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Container, Row, Col, Table, Button, Form } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import NavigationBar from './NavigationBar';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const ITEMS_PER_LOAD = 20;
const RESTOCK_ITEMS_STORAGE_KEY = 'restockItems';

function RestockRequest() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [restockItems, setRestockItems] = useState<any[]>(() => {
    try {
      const storedItems = localStorage.getItem(RESTOCK_ITEMS_STORAGE_KEY);
      return storedItems ? JSON.parse(storedItems) : [];
    } catch (error) {
      console.error("Failed to parse restock items from localStorage", error);
      return [];
    }
  });
  const [quantities, setQuantities] = useState<{ [key: string]: string }>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  // States for filters
  const [sourceWarehouses, setSourceWarehouses] = useState<any[]>([]);
  const [destinationWarehouses, setDestinationWarehouses] = useState<any[]>([]);
  const [sourceLocations, setSourceLocations] = useState<any[]>([]);
  const [destinationLocations, setDestinationLocations] = useState<any[]>([]);

  const [sourceWarehouse, setSourceWarehouse] = useState<string>('');
  const [sourceLocation, setSourceLocation] = useState<string>('');
  const [destinationWarehouse, setDestinationWarehouse] = useState<string>('');
  const [destinationLocation, setDestinationLocation] = useState<string>('');

  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const loadingMoreRef = useRef<boolean>(false);
  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const user = useMemo(() => JSON.parse(localStorage.getItem('loggedInUser') || '{}'), []);
  const creatorCode = user.code || null;

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Set initial date
  useEffect(() => {
    setSelectedDate(getTodayDate());
  }, []);

  // Parse URL parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const sourceWarehouseParam = queryParams.get('sourceWarehouse');
    if (sourceWarehouseParam) {
      setSourceWarehouse(sourceWarehouseParam);
    }
  }, [location.search]);

  // Fetch source and destination warehouses on component mount
  useEffect(() => {
    const fetchWarehouses = async (apiUrl: string, setter: React.Dispatch<React.SetStateAction<any[]>>) => {
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setter(data);
        } else {
          console.error("Fetched data is not an array:", data);
          setter([]);
        }
      } catch (error) {
        console.error("Failed to fetch warehouses", error);
        setter([]);
      }
    };
    // Both source and destination warehouses should use the same endpoint to show all warehouses
    fetchWarehouses(`${import.meta.env.VITE_FASTAPI_URL}/api/warehouses`, setSourceWarehouses);
    fetchWarehouses(`${import.meta.env.VITE_FASTAPI_URL}/api/warehouses`, setDestinationWarehouses);
  }, []);

  // Auto-select source warehouse based on user's warehouse when warehouses are loaded
  useEffect(() => {
    if (sourceWarehouses.length > 0 && !sourceWarehouse) {
      // Get user's warehouse code
      const loggedInUser = localStorage.getItem('loggedInUser');
      let userWarehouseCode = '1301'; // Default
      if (loggedInUser) {
        try {
          const userData = JSON.parse(loggedInUser);
          userWarehouseCode = userData.ic_wht || '1301';
        } catch (e) {
          console.error("Failed to parse user data", e);
        }
      }
      
      // Select user's warehouse if it exists in the list
      const userWarehouse = sourceWarehouses.find(wh => wh.code === userWarehouseCode);
      if (userWarehouse) {
        setSourceWarehouse(userWarehouseCode);
      } else {
        // Fallback to warehouse 1301 if user's warehouse not found
        const warehouse1301 = sourceWarehouses.find(wh => wh.code === '1301');
        if (warehouse1301) {
          setSourceWarehouse('1301');
        }
      }
    }
  }, [sourceWarehouses, sourceWarehouse]);

  // Auto-select default destination warehouse
  useEffect(() => {
    if (destinationWarehouses.length > 0 && !destinationWarehouse) {
      const userWarehouse = destinationWarehouses.find(wh => wh.code === user.ic_wht);
      if (userWarehouse) {
        setDestinationWarehouse(user.ic_wht);
      }
    }
  }, [destinationWarehouses, user.ic_wht, destinationWarehouse]);

  // Fetch source locations when source warehouse changes
  useEffect(() => {
    if (sourceWarehouse) {
      const fetchLocations = async () => {
        setSourceLocations([]);
        try {
          const response = await fetch(`${import.meta.env.VITE_FASTAPI_URL}/api/locations/${sourceWarehouse}`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          setSourceLocations(data);
        } catch (error) {
          console.error(`Failed to fetch locations for warehouse ${sourceWarehouse}`, error);
        }
      };
      fetchLocations();
    } else {
      setSourceLocations([]);
    }
  }, [sourceWarehouse]);

  // Fetch destination locations when destination warehouse changes
  useEffect(() => {
    if (destinationWarehouse) {
      const fetchLocations = async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_FASTAPI_URL}/api/destination-locations/${destinationWarehouse}`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const newLocations = await response.json();
          setDestinationLocations(newLocations);

          // Check if the currently selected location is still valid
          const isCurrentLocationInNewList = newLocations.some((loc: any) => loc.code === destinationLocation);
          if (!isCurrentLocationInNewList) {
            setDestinationLocation(''); // If not, clear the selection
          }
        } catch (error) {
          console.error(`Failed to fetch destination locations for warehouse ${destinationWarehouse}`, error);
          setDestinationLocations([]);
          setDestinationLocation('');
        }
      };
      fetchLocations();
    } else {
      setDestinationLocations([]);
      setDestinationLocation('');
    }
  }, [destinationWarehouse]);

  // Auto-select default destination location
  useEffect(() => {
    if (destinationLocations.length > 0 && !destinationLocation) {
      const userLocation = destinationLocations.find(loc => loc.code === user.ic_shelf);
      if (userLocation) {
        setDestinationLocation(user.ic_shelf);
      }
    }
  }, [destinationLocations, user.ic_shelf, destinationLocation]);

  useEffect(() => {
    localStorage.setItem(RESTOCK_ITEMS_STORAGE_KEY, JSON.stringify(restockItems));
  }, [restockItems]);

  const fetchData = async (currentOffset: number, date: string, whCode: string) => {
    if (loadingMoreRef.current || !whCode) return;
    loadingMoreRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Get user's warehouse code for comparison data
      const loggedInUser = localStorage.getItem('loggedInUser');
      let userWarehouseCode = '1301'; // Default
      if (loggedInUser) {
        try {
          const userData = JSON.parse(loggedInUser);
          userWarehouseCode = userData.ic_wht || '1301';
        } catch (e) {
          console.error("Failed to parse user data", e);
        }
      }

      const dateParam = date ? `&doc_date=${date}` : '';
      const locationParam = whCode ? `&wh_code=${whCode}` : '';
      const userWarehouseParam = `&user_wh_code=${userWarehouseCode}`;
      const response = await fetch(`${import.meta.env.VITE_FASTAPI_URL}/api/analysis-data?limit=${ITEMS_PER_LOAD}&offset=${currentOffset}${dateParam}${locationParam}${userWarehouseParam}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      const sortedData = result.sort((a: any, b: any) => a.balance_qty - b.qty);

      if (currentOffset === 0) {
        setData(sortedData);
      } else {
        setData(prevData => [...prevData, ...sortedData]);
      }

      setHasMore(result.length === ITEMS_PER_LOAD);

      const newQuantities: { [key: string]: string } = {};
      sortedData.forEach((item: any) => {
        newQuantities[item.item_code] = '1';
      });
      setQuantities(prevQuantities => ({ ...prevQuantities, ...newQuantities }));

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
    }
  };

  useEffect(() => {
    if (!sourceWarehouse) {
      setData([]);
      return;
    }
    setData([]);
    setOffset(0);
    setHasMore(true);
    fetchData(0, selectedDate, sourceWarehouse);
  }, [selectedDate, sourceWarehouse]);

  useEffect(() => {
    const container = scrollableContainerRef.current;
    const handleScroll = () => {
      if (container) {
        const { scrollHeight, scrollTop, clientHeight } = container;
        if (scrollHeight - scrollTop <= clientHeight + 1 && hasMore && !loading && !loadingMoreRef.current) {
          loadingMoreRef.current = true;
          setTimeout(() => {
            setOffset(prevOffset => prevOffset + ITEMS_PER_LOAD);
            loadingMoreRef.current = false;
          }, 1000);
        }
      }
    };

    if (container) {
      container.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [hasMore, loading]);

  useEffect(() => {
    if (offset > 0) {
      fetchData(offset, selectedDate, sourceWarehouse);
    }
  }, [offset]);

  const handleQuantityChange = (itemCode: string, value: string) => {
    setQuantities(prevQuantities => ({ ...prevQuantities, [itemCode]: value }));
  };

  const handleAddItem = (item: any) => {
    const quantity = parseInt(quantities[item.item_code] || '0');
    if (quantity <= 0) {
      alert('ກະລຸນາປ້ອນຈຳນວນທີ່ຖືກຕ້ອງ.');
      return;
    }
    const existingItemIndex = restockItems.findIndex(ri => ri.item_code === item.item_code);

    if (existingItemIndex > -1) {
      const updatedRestockItems = [...restockItems];
      updatedRestockItems[existingItemIndex].quantity += quantity;
      setRestockItems(updatedRestockItems);
    } else {
      setRestockItems(prevItems => [...prevItems, { ...item, quantity }]);
    }
  };

  const handleRemoveItem = (itemCode: string) => {
    setRestockItems(prevItems => prevItems.filter(item => item.item_code !== itemCode));
  };

  const handleGenerateBill = async () => {
    if (restockItems.length === 0) {
      alert('ກະລຸນາເລືອກສິນຄ້າທີ່ຈະເບີກກ່ອນ.');
      return;
    }

    try {
      // Generate transfer number from backend
      const transferNoResponse = await fetch(`${import.meta.env.VITE_FASTAPI_URL}/api/generate-transfer-no`);
      if (!transferNoResponse.ok) {
        throw new Error('Failed to generate transfer number');
      }
      const transferNoData = await transferNoResponse.json();
      const transferNo = transferNoData.transfer_no;

      const transferPayload = {
        transfer_no: transferNo,
        creator: creatorCode,
        wh_from: sourceWarehouse,
        location_from: sourceLocation,
        wh_to: destinationWarehouse,
        location_to: destinationLocation,
        details: restockItems.map(item => ({
          ...item,
          wh_code: sourceWarehouse,
          shelf_code: sourceLocation,
          wh_code_2: destinationWarehouse,
          shelf_code_2: destinationLocation,
        })),
      };

      const response = await fetch(`${import.meta.env.VITE_FASTAPI_URL}/api/transfers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transferPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create transfer in database.');
      }

      alert('ສ້າງໃບໂອນສຳເລັດ!');
      setRestockItems([]);
      navigate('/transfers');

    } catch (error) {
      console.error('Error creating transfer:', error);
      alert(`ເກີດຂໍ້ຜິດພາດໃນການສ້າງໃບໂອນ: ${error}`);
    }
  };

  return (
    <div>
      <NavigationBar />
      <Container fluid className="mt-4">
        <Row className="mb-3 px-3 align-items-end">
            <Col md={2}>
              <Form.Group controlId="formDate">
                <Form.Label>ເລືອກວັນທີ:</Form.Label>
                <DatePicker
                  selected={selectedDate ? new Date(selectedDate) : null}
                  onChange={(date: Date | null) => setSelectedDate(date ? date.toISOString().split('T')[0] : '')}
                  dateFormat="yyyy-MM-dd"
                  className="form-control form-control-sm"
                  placeholderText="ກະລຸນາເລືອກວັນທີ"
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group controlId="sourceWarehouse">
                <Form.Label>ຄັງຕົ້ນທາງ:</Form.Label>
                <Form.Select
                  value={sourceWarehouse}
                  onChange={(e) => setSourceWarehouse(e.target.value)}
                  className="form-select-sm"
                >
                  <option value="">ເລືອກຄັງ...</option>
                  {sourceWarehouses.map(wh => (
                    <option key={`swh-${wh.code}`} value={wh.code}>{wh.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group controlId="sourceLocation">
                <Form.Label>ບ່ອນເກັບຕົ້ນທາງ:</Form.Label>
                <Form.Select
                  value={sourceLocation}
                  onChange={(e) => setSourceLocation(e.target.value)}
                  disabled={!sourceWarehouse}
                  className="form-select-sm"
                >
                  <option value="">ເລືອກບ່ອນເກັບ...</option>
                  {sourceLocations.map(loc => (
                    <option key={`sloc-${loc.code}`} value={loc.code}>{loc.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group controlId="destinationWarehouse">
                <Form.Label>ຄັງປາຍທາງ:</Form.Label>
                <Form.Select
                  value={destinationWarehouse}
                  onChange={(e) => setDestinationWarehouse(e.target.value)}
                  className="form-select-sm"
                >
                  <option value="">ເລືອກຄັງ...</option>
                  {destinationWarehouses.map(wh => (
                    <option key={`dwh-${wh.code}`} value={wh.code}>{wh.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group controlId="destinationLocation">
                <Form.Label>ບ່ອນເກັບປາຍທາງ:</Form.Label>
                <Form.Select
                  value={destinationLocation}
                  onChange={(e) => setDestinationLocation(e.target.value)}
                  disabled={!destinationWarehouse}
                  className="form-select-sm"
                >
                  <option value="">ເລືອກບ່ອນເກັບ...</option>
                  {destinationLocations.map(loc => (
                    <option key={`dloc-${loc.code}`} value={loc.code}>{loc.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
        </Row>
        <Row>
          <Col md={8}>
            <h2>ຂໍໂອນເຄື່ອງ</h2>
            <div ref={scrollableContainerRef} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {data.length === 0 && !loading ? (
                <p>ບໍ່ພົບຂໍ້ມູນສິນຄ້າ.</p>
              ) : (
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>ວັນທີ</th>
                      <th>ລະຫັດສິນຄ້າ</th>
                      <th>ຊື່ສິນຄ້າ</th>
                      <th>ຫົວໜ່ວຍ</th>
                      <th>ຈຳນວນທີ່ເຫລືອມື້ກ່ອນ</th>
                      <th>ຂາຍໄປແລ້ວ</th>
                      <th>ຍັງເຫຼືອ</th>
                      <th>ເຕີມໄດ້</th>
                      <th>ຈຳນວນທີ່ຈະເບີກ</th>
                      <th>ເພີ່ມ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td>{new Date(row.doc_date).toLocaleDateString('en-GB')}</td>
                        <td>{row.item_code}</td>
                        <td>{row.item_name}</td>
                        <td>{row.unit_code}</td>
                        <td>{Math.floor(row.balance_qty_start || 0)}</td>
                        <td>{Math.floor(row.sale_qty)}</td>
                        <td>{Math.floor(row.balance_qty)}</td>
                        <td>{Math.floor(row.balance_qty_compare || 0)}</td>
                        <td>
                          <Form.Control
                            type="number"
                            min="0"
                            value={quantities[row.item_code] || ''}
                            onChange={(e) => handleQuantityChange(row.item_code, e.target.value)}
                            style={{ width: '80px' }}
                          />
                        </td>
                        <td>
                          <Button variant="primary" onClick={() => handleAddItem(row)}>
                            ເພີ່ມ
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              {loading && offset > 0 && <p>ກຳລັງໂຫຼດຂໍ້ມູນເພີ່ມເຕີມ...</p>}
              {!hasMore && data.length > 0 && <p>ບໍ່ມີຂໍ້ມູນເພີ່ມເຕີມ.</p>}
            </div>
          </Col>
          <Col md={4}>
            <h2>ບິນຂໍໂອນສິນຄ້າ</h2>
            <Button 
              variant="success" 
              className="mb-3 w-100"
              onClick={handleGenerateBill}
              disabled={!selectedDate || !sourceWarehouse || !sourceLocation || !destinationWarehouse || !destinationLocation}
            >
              ສ້າງບິນຂໍໂອນ
            </Button>
            {restockItems.length === 0 ? (
              <p>ຍັງບໍ່ມີສິນຄ້າໃນບິນຂໍໂອນ.</p>
            ) : (
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>ຊື່ສິນຄ້າ</th>
                    <th>ຈຳນວນ</th>
                    <th>ຈັດການ</th>
                  </tr>
                </thead>
                <tbody>
                  {restockItems.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <div>{item.item_name}</div>
                        <small className="text-muted">{item.item_code}</small>
                      </td>
                      <td>{item.quantity}</td>
                      <td>
                        {<Button variant="danger" size="sm" onClick={() => handleRemoveItem(item.item_code)}>
                          ລຶບ
                        </Button> }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default RestockRequest;
