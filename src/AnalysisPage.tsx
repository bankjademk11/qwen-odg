import React, { useState, useEffect } from 'react';
import { Container, Table } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import NavigationBar from './NavigationBar';

const AnalysisPage: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/analysis-data');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div>
        <NavigationBar />
        <Container className="mt-4">
          <h2>Analysis Data (Loading...)</h2>
          <p>Loading analysis data from backend...</p>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <NavigationBar />
        <Container className="mt-4">
          <h2>Analysis Data (Error)</h2>
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
        <h2>Analysis Data</h2>
        {data.length === 0 ? (
          <p>No data found for analysis.</p>
        ) : (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>ວັນທີ</th>
                <th>ລະຫັດສິນຄ້າ</th>
                <th>ຊື່ສິນຄ້າ</th>
                <th>ປະເພດສິນຄ້າ</th>
                <th>ຂາຍໄປແລ້ວ</th>
                <th>ເຫຼືອໜ້າຮ້ານ</th>
                <th>ເຫຼືອໃນສາງ</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td>{row.doc_date}</td>
                  <td>{row.item_code}</td>
                  <td>{row.item_name}</td>
                  <td>{row.unit_code}</td>
                  <td>{row.sale_qty}</td>
                  <td>{row.balance_qty}</td>
                  <td>{row.balance_qty_1302}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Container>
    </div>
  );
};

export default AnalysisPage;