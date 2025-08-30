import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Table, Button, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import NavigationBar from './NavigationBar';

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

  const user = JSON.parse(localStorage.getItem('user') || '{}');
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
    fetchWarehouses('http://localhost:3001/api/warehouses', setSourceWarehouses);
    fetchWarehouses('http://localhost:3001/api/destination-warehouses', setDestinationWarehouses);
  }, []);

  // DEBUG: Set default destination warehouse after the list has been loaded
  useEffect(() => {
    console.log("Checking for default destination warehouse...");
    console.log("User WHT:", user.ic_wht);
    console.log("Destination warehouses loaded:", destinationWarehouses);
    if (user && user.ic_wht && destinationWarehouses.length > 0) {
      const userWarehouseExists = destinationWarehouses.some(wh => wh.code === user.ic_wht);
      console.log("Does user warehouse exist in list?", userWarehouseExists);
      if (userWarehouseExists) {
        console.log("Setting destination warehouse to:", user.ic_wht);
        setDestinationWarehouse(user.ic_wht);
      }
    }
  }, [destinationWarehouses, user]);

  // Fetch source locations when source warehouse changes
  useEffect(() => {
    if (sourceWarehouse) {
      const fetchLocations = async () => {
        setSourceLocations([]);
        try {
          const response = await fetch(`http://localhost:3001/api/locations/${sourceWarehouse}`);
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
        setDestinationLocations([]);
        try {
          const response = await fetch(`http://localhost:3001/api/destination-locations/${destinationWarehouse}`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          setDestinationLocations(data);
        } catch (error) {
          console.error(`Failed to fetch destination locations for warehouse ${destinationWarehouse}`, error);
        }
      };
      fetchLocations();
    } else {
      setDestinationLocations([]);
    }
  }, [destinationWarehouse]);

  // DEBUG: Set default destination location after the list has been loaded
  useEffect(() => {
    console.log("Checking for default destination location...");
    console.log("User Shelf:", user.ic_shelf);
    console.log("Destination locations loaded:", destinationLocations);
    if (user && user.ic_shelf && destinationLocations.length > 0) {
      const userShelfExists = destinationLocations.some(loc => loc.code === user.ic_shelf);
      console.log("Does user shelf exist in list?", userShelfExists);
      if (userShelfExists) {
        console.log("Setting destination location to:", user.ic_shelf);
        setDestinationLocation(user.ic_shelf);
      }
    }
  }, [destinationLocations, user]);

  useEffect(() => {
    localStorage.setItem(RESTOCK_ITEMS_STORAGE_KEY, JSON.stringify(restockItems));
  }, [restockItems]);

  const fetchData = async (currentOffset: number, date: string, whCode: string) => {
    if (loadingMoreRef.current || !whCode) return;
    loadingMoreRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const dateParam = date ? `&doc_date=${date}` : '';
      const locationParam = whCode ? `&wh_code=${whCode}` : '';
      const response = await fetch(`http://localhost:3001/api/analysis-data?limit=${ITEMS_PER_LOAD}&offset=${currentOffset}${dateParam}${locationParam}`);
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

    const transferPayload = {
      transfer_no: `FRP${Date.now()}`.slice(0, 12),
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

    try {
      const response = await fetch('http://localhost:3001/api/transfers', {
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
        <Row className="mb-3 px-3">
            <Col md={3}>
              <Form.Group controlId="formDate">
                <Form.Label>ເລືອກວັນທີ:</Form.Label>
                <Form.Control
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group controlId="sourceWarehouse">
                <Form.Label>ຄັງຕົ້ນທາງ:</Form.Label>
                <Form.Select
                  value={sourceWarehouse}
                  onChange={(e) => setSourceWarehouse(e.target.value)}
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
                >
                  <option value="">ເລືອກຄັງ...</option>
                  {destinationWarehouses.map(wh => (
                    <option key={`dwh-${wh.code}`} value={wh.code}>{wh.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group controlId="destinationLocation">
                <Form.Label>ບ່ອນເກັບປາຍທາງ:</Form.Label>
                <Form.Select
                  value={destinationLocation}
                  onChange={(e) => setDestinationLocation(e.target.value)}
                  disabled={!destinationWarehouse}
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
            <h2>ຂໍເບີກ</h2>
            <div ref={scrollableContainerRef} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {data.length === 0 && !loading ? (
                <p>ບໍ່ພົບຂໍ້ມູນສິນຄ້າ.</p>
              ) : (
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>ລະຫັດສິນຄ້າ</th>
                      <th>ຊື່ສິນຄ້າ</th>
                      <th>ຈຳນວນທີ່ເຫລືອມື້ກ່ອນ</th>
                      <th>ໜ້າຮ້ານ</th>
                      <th>ຫຼັງຮ້ານ</th>
                      <th>ຂາຍໄປແລ້ວ</th>
                      <th>ຈຳນວນທີ່ຈະເບີກ</th>
                      <th>ເພີ່ມ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td>{row.item_code}</td>
                        <td>{row.item_name}</td>
                        <td>{Math.floor(row.balance_qty_start || 0)}</td>
                        <td>{Math.floor(row.balance_qty)}</td>
                        <td>{Math.floor(row.balance_qty_1302)}</td>
                        <td>{Math.floor(row.sale_qty)}</td>
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
            <h2>ບິນຂໍເບີກສິນຄ້າ</h2>
            <Button 
              variant="success" 
              className="mb-3 w-100"
              onClick={handleGenerateBill}
            >
              ສ້າງບິນຂໍເບີກ
            </Button>
            {restockItems.length === 0 ? (
              <p>ຍັງບໍ່ມີສິນຄ້າໃນບິນຂໍເບີກ.</p>
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
                        <Button variant="danger" size="sm" onClick={() => handleRemoveItem(item.item_code)}>
                          ລຶບ
                        </Button>
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
