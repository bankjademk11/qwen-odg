import React, { useState, useEffect } from 'react';
import { Container, Table, Spinner, Alert } from 'react-bootstrap';
import NavigationBar from './NavigationBar';

// Interface for a single bill/invoice
interface Bill {
  doc_no: string;
  doc_date: string;
  customer_name: string; // Assuming backend provides customer name
  total_amount: number;
  payment_method: string;
}

const HistoryPage = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const response = await fetch('http://localhost:5000/billings');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Assuming the API returns { list: [...] } like other endpoints
        setBills(data.list || []); 
      } catch (e: any) {
        setError(e.message);
        console.error("Failed to fetch bills:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, []);

  return (
    <>
      <NavigationBar />
      <Container className="mt-4">
        <h2 className="mb-4">ประวัติการขาย</h2>
        
        {loading ? (
          <div className="text-center">
            <Spinner animation="border" />
            <p>ກຳລັງໂຫລດຂໍ້ມູນ...</p>
          </div>
        ) : error ? (
          <Alert variant="danger">ມີຂໍ້ຜິດພາດໃນການດຶງຂໍ້ມູນ: {error}</Alert>
        ) : (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>เลขที่บิล</th>
                <th>วันที่</th>
                <th>ลูกค้า</th>
                <th>วิธีชำระเงิน</th>
                <th className="text-end">ยอดรวม</th>
              </tr>
            </thead>
            <tbody>
              {bills.length > 0 ? (
                bills.map(bill => (
                  <tr key={bill.doc_no}>
                    <td>{bill.doc_no}</td>
                    <td>{new Date(bill.doc_date).toLocaleDateString()}</td>
                    <td>{bill.customer_name}</td>
                    <td>{bill.payment_method}</td>
                    <td className="text-end">{bill.total_amount.toLocaleString()} ₭</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center text-muted">ไม่พบข้อมูลประวัติการขาย</td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Container>
    </>
  );
};

export default HistoryPage;
