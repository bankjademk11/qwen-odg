import React, { useState, useEffect, useRef } from 'react';
import { Container, Table, Form } from 'react-bootstrap';
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

  const fetchData = async (currentOffset: number, date: string) => {
    if (loadingMoreRef.current) return; // Prevent multiple simultaneous loads
    loadingMoreRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const dateParam = date ? `&doc_date=${date}` : '';
      const response = await fetch(`http://localhost:3001/api/analysis-data?limit=${ITEMS_PER_LOAD}&offset=${currentOffset}${dateParam}`);
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

  useEffect(() => {
    setData([]); // Clear data when date changes
    setOffset(0);
    setHasMore(true);
    fetchData(0, selectedDate);
  }, [selectedDate]);

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
      fetchData(offset, selectedDate);
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
          <p>Please ensure your backend server is running at http://localhost:3001.</p>
        </Container>
      </div>
    );
  }

  return (
    <div>
      <NavigationBar />
      <Container className="mt-4">
        <h2>ການເຄື່ອນໄຫວສິນຄ້າ</h2>
        <Form.Group controlId="formDate" className="mb-3">
          <Form.Label>ເລືອກວັນທີ:</Form.Label>
          <Form.Control
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </Form.Group>
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
                <th>ໜ້າຮ້ານ</th>
                <th>ຫຼັງຮ້ານ</th>
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
        {loading && offset > 0 && <p>ກຳລັງໂຫຼດຂໍ້ມູນເພີ່ມເຕີມ...</p>}
        {!hasMore && data.length > 0 && <p>ບໍ່ມີຂໍ້ມູນເພີ່ມເຕີມ.</p>}
      </Container>
    </div>
  );
};

export default ProductList;