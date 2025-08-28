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
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const loadingMoreRef = useRef<boolean>(false);
  const scrollableContainerRef = useRef<HTMLDivElement>(null); // Ref for the scrollable div
  const navigate = useNavigate();

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    setSelectedDate(getTodayDate());
  }, []);

  useEffect(() => {
    localStorage.setItem(RESTOCK_ITEMS_STORAGE_KEY, JSON.stringify(restockItems));
  }, [restockItems]);

  const fetchData = async (currentOffset: number, date: string, location: string) => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const dateParam = date ? `&doc_date=${date}` : '';
      const locationParam = location ? `&wh_code=${location}` : '';
      const response = await fetch(`http://localhost:3001/api/analysis-data?limit=${ITEMS_PER_LOAD}&offset=${currentOffset}${dateParam}${locationParam}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      const sortedData = result.sort((a: any, b: any) => a.balance_qty - b.balance_qty);

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
    setData([]);
    setOffset(0);
    setHasMore(true);
    fetchData(0, selectedDate, selectedLocation);
  }, [selectedDate, selectedLocation]);

  // Modified useEffect for infinite scroll to use the container ref
  useEffect(() => {
    const container = scrollableContainerRef.current;
    const handleScroll = () => {
      if (container) {
        const { scrollHeight, scrollTop, clientHeight } = container;
        // Load more when the user is 1px from the bottom
        if (scrollHeight - scrollTop <= clientHeight + 1 && hasMore && !loading && !loadingMoreRef.current) {
          loadingMoreRef.current = true;
          setTimeout(() => {
            setOffset(prevOffset => prevOffset + ITEMS_PER_LOAD);
            loadingMoreRef.current = false;
          }, 1000); // Reduced delay for better UX
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
      fetchData(offset, selectedDate, selectedLocation);
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

  const handleGenerateBill = () => {
    if (restockItems.length === 0) {
      alert('ກະລຸນາເລືອກສິນຄ້າທີ່ຈະເບີກກ່ອນ.');
      return;
    }
    const totalQuantity = restockItems.reduce((sum, item) => sum + item.quantity, 0);
    const now = new Date();
    const newTransfer = {
      id: Date.now(),
      doc_date_time: now.toLocaleString('sv-SE'),
      transfer_no: `TRF-${Date.now()}`,
      quantity: totalQuantity,
      creator: 'CurrentUser',
      details: restockItems
    };
    navigate('/transfers', { state: { newTransfer: newTransfer } });
    setRestockItems([]);
    setQuantities({});
  };

  const isGenerateBillButtonDisabled = selectedDate !== getTodayDate();
  const isAddItemButtonDisabled = selectedDate !== getTodayDate();

  return (
    <div>
      <NavigationBar />
      <Container fluid className="mt-4">
        <Row className="mb-3 px-3">
            <Col md={4}>
              <Form.Group controlId="formDate">
                <Form.Label>ເລືອກວັນທີ:</Form.Label>
                <Form.Control
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="formLocation">
                <Form.Label>ຕຳແໜ່ງ:</Form.Label>
                <Form.Select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                >
                  <option value="">ທັງໝົດ</option>
                  <option value="1301">1301</option>
                  <option value="1302">1302</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="formCondition">
                <Form.Label>ສະພາບ:</Form.Label>
                <Form.Select
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value)}
                >
                  <option value="">ທັງໝົດ</option>
                  <option value="ສະພາບດີ">ສະພາບດີ</option>
                  <option value="ສະພາບດີຫຼາຍ">ສະພາບດີຫຼາຍ</option>
                  <option value="ສະພາບໃຫມ່">ສະພາບໃຫມ່</option>
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
                            disabled={isAddItemButtonDisabled}
                          />
                        </td>
                        <td>
                          <Button variant="primary" onClick={() => handleAddItem(row)} disabled={isAddItemButtonDisabled}>
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
              disabled={isGenerateBillButtonDisabled}
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
