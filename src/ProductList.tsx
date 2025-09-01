import React, { useState, useEffect, useRef } from 'react';
import { Container, Table, Form, Row, Col } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import NavigationBar from './NavigationBar';

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
      const dateParam = date ? `&doc_date=${date}` : '';
      const warehouseParam = whCode ? `&wh_code=${whCode}` : '';
      const response = await fetch(`http://localhost:8004/api/analysis-data?limit=${ITEMS_PER_LOAD}&offset=${currentOffset}${dateParam}${warehouseParam}`);
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

  // Auto-select warehouse 1301 when warehouses are loaded
  useEffect(() => {
    if (warehouses.length > 0 && !selectedWarehouse) {
      const warehouse1301 = warehouses.find(wh => wh.code === '1301');
      if (warehouse1301) {
        setSelectedWarehouse('1301');
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
        <NavigationBar />
        <Container className="mt-4">
          <h2>Product List (Loading...)</h2>
          <p>Loading products from backend...</p>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <NavigationBar />
        <Container className="mt-4">
          <h2>Product List (Error)</h2>
          <p>Error: {error}</p>
          <p>Please ensure your backend server is running at http://localhost:8004.</p>
        </Container>
      </div>
    );
  }

  return (
    <div>
      <NavigationBar />
      <Container className="mt-4">
        <h2>ການເຄື່ອນໄຫວສິນຄ້າ</h2>
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group controlId="formDate" className="mb-3">
              <Form.Label>ເລືອກວັນທີ:</Form.Label>
              <Form.Control
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="warehouseFilter" className="mb-3">
              <Form.Label>ຄັງສິນຄ້າ:</Form.Label>
              <Form.Select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
              >
                <option value="">ທັງຫມົດ</option>
                {warehouses.map(wh => (
                  <option key={`wh-${wh.code}`} value={wh.code}>{wh.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
        {data.length === 0 && !loading ? (
          <p>No data found for analysis.</p>
        ) : (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>ວັນທີ</th>
                <th>ລະຫັດສິນຄ້າ</th>
                <th>ຊື່ສິນຄ້າ</th>
                <th>ປະເພດສິນຄ້າ</th>
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
                  <td>{Math.floor(row.balance_qty_1302)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {loading && offset > 0 && <p>ກຳລັງໂຫຼດຂໍມູນເພີ່ມເຕີມ...</p>}
        {!hasMore && data.length > 0 && <p>ບໍ່ມີຂໍມູນເພີ່ມເຕີມ.</p>}
      </Container>
    </div>
  );
};

export default ProductList;