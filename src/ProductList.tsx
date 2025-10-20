import React, { useState, useEffect, useRef } from 'react';
import { Container, Table, Form, Row, Col, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import NavigationBar from './NavigationBar';
import { Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './ProductList.css';

const ITEMS_PER_LOAD = 20;

const ProductList: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const loadingMoreRef = useRef<boolean>(false);
  
  // Warehouse filter states
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchData = async (currentOffset: number, date: string, whCode: string = '') => {
    if (loadingMoreRef.current) return; // Prevent multiple simultaneous loads
    loadingMoreRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Get user's warehouse code
      const user = localStorage.getItem('loggedInUser');
      let userWarehouseCode = '1301'; // Default
      if (user) {
        try {
          const userData = JSON.parse(user);
          userWarehouseCode = userData.ic_wht || '1301';
        } catch (e) {
          console.error("Failed to parse user data", e);
        }
      }

      const dateParam = date ? `&doc_date=${date}` : '';
      const warehouseParam = whCode ? `&wh_code=${whCode}` : '';
      const userWarehouseParam = `&user_wh_code=${userWarehouseCode}`;
      const response = await fetch(`${import.meta.env.VITE_FASTAPI_URL}/api/analysis-data?limit=${ITEMS_PER_LOAD}&offset=${currentOffset}${dateParam}${warehouseParam}${userWarehouseParam}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();

      if (currentOffset === 0) {
        setData(result);
      } else {
        setData(prevData => [...prevData, ...result]);
      }

      setHasMore(result.length === ITEMS_PER_LOAD);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
    }
  };

  // Set initial date to today
  useEffect(() => {
    setSelectedDate(getTodayDate());
  }, []);

  // Fetch warehouses on component mount
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const response = await fetch('http://localhost:8004/api/warehouses');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setWarehouses(data);
        } else {
          console.error("Fetched warehouse data is not an array:", data);
          setWarehouses([]);
        }
      } catch (error) {
        console.error("Failed to fetch warehouses", error);
        setWarehouses([]);
      }
    };
    fetchWarehouses();
  }, []);

  // Auto-select user's warehouse when warehouses are loaded
  useEffect(() => {
    if (warehouses.length > 0 && !selectedWarehouse) {
      // Get user's warehouse code
      const user = localStorage.getItem('loggedInUser');
      let userWarehouseCode = '1301'; // Default
      if (user) {
        try {
          const userData = JSON.parse(user);
          userWarehouseCode = userData.ic_wht || '1301';
        } catch (e) {
          console.error("Failed to parse user data", e);
        }
      }
      
      // Select user's warehouse if it exists in the list
      const userWarehouse = warehouses.find(wh => wh.code === userWarehouseCode);
      if (userWarehouse) {
        setSelectedWarehouse(userWarehouseCode);
      } else {
        // Fallback to warehouse 1301 if user's warehouse not found
        const warehouse1301 = warehouses.find(wh => wh.code === '1301');
        if (warehouse1301) {
          setSelectedWarehouse('1301');
        }
      }
    }
  }, [warehouses, selectedWarehouse]);

  useEffect(() => {
    setData([]); // Clear data when date or warehouse changes
    setOffset(0);
    setHasMore(true);
    fetchData(0, selectedDate, selectedWarehouse);
  }, [selectedDate, selectedWarehouse]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 100 && hasMore && !loading && !loadingMoreRef.current) {
        loadingMoreRef.current = true;
        setTimeout(() => {
          setOffset(prevOffset => prevOffset + ITEMS_PER_LOAD);
          loadingMoreRef.current = false;
        }, 3000); // 3-second delay
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading]);

  useEffect(() => {
    if (offset > 0) {
      fetchData(offset, selectedDate, selectedWarehouse);
    }
  }, [offset]);

  if (loading && offset === 0) {
    return (
      <div>
        
        <Container className="mt-4">
          <div className="product-list-container">
            <div className="product-list-header">
              <h2>ການເຄື່ອນໄຫວສິນຄ້າ (Loading...)</h2>
            </div>
            <div className="loading-indicator">
              <p>Loading products from backend...</p>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        
        <Container className="mt-4">
          <div className="product-list-container">
            <div className="product-list-header">
              <h2>ການເຄື່ອນໄຫວສິນຄ້າ (Error)</h2>
            </div>
            <div className="alert alert-danger">
              <p>Error: {error}</p>
              <p>Please ensure your backend server is running at {import.meta.env.VITE_FASTAPI_URL}.</p>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div>
      
      <Container className="mt-4">
        <div className="product-list-container">
          <div className="product-list-header">
            <h2>ການເຄື່ອນໄຫວສິນຄ້າ</h2>
          </div>
          
          <div className="filter-section">
            <Row className="filter-row justify-content-between">
              <Col md={3}>
                <Form.Group controlId="formDate" className="mb-1">
                  <Form.Label className="mb-1">ເລືອກວັນທີ:</Form.Label>
                  <DatePicker
                    selected={selectedDate ? new Date(selectedDate) : null}
                    onChange={(date: Date | null) => setSelectedDate(date ? date.toISOString().split('T')[0] : '')}
                    dateFormat="yyyy-MM-dd"
                    className="form-control form-control-sm"
                    placeholderText="ກະລຸນາເລືອກວັນທີ"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group controlId="warehouseFilter" className="mb-1">
                  <Form.Label className="mb-1">ຄັງສິນຄ້າ:</Form.Label>
                  <Form.Select
                    value={selectedWarehouse}
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                    className="form-control form-control-sm"
                  >
                    <option value="">ທັງຫມົດ</option>
                    {warehouses.map(wh => (
                      <option key={`wh-${wh.code}`} value={wh.code}>{wh.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </div>
          
          <div className="restock-button-container">
            <Link to={`/restock?sourceWarehouse=${selectedWarehouse}`}>
              {/* <Button variant="primary">ໄປທີ່ໜ້າ Restock ດ້ວຍຄັງທີ່ເລືອກ</Button> */}
            </Link>
          </div>
          
          <div className="product-table">
            {data.length === 0 && !loading ? (
              <div className="no-data-message">
                <p>No data found for analysis.</p>
              </div>
            ) : (
              <Table striped bordered hover responsive className="mb-0">
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
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
          
          {loading && offset > 0 && (
            <div className="loading-indicator">
              <p>ກຳລັງໂຫຼດຂໍມູນເພີ່ມເຕີມ...</p>
            </div>
          )}
          
          {!hasMore && data.length > 0 && (
            <div className="loading-indicator">
              <p>ບໍ່ມີຂໍມູນເພີ່ມເຕີມ.</p>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
};

export default ProductList;