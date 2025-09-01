import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Button, Form, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import NavigationBar from './NavigationBar';

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TransferPage: React.FC = () => {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Default the date filter to today
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [transferNumber, setTransferNumber] = useState<string>('');

  const navigate = useNavigate();

  // Fetch transfers whenever the selectedDate changes
  useEffect(() => {
    const fetchTransfers = async () => {
      if (!selectedDate) return; // Do not fetch if date is empty

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:8004/api/transfers?date=${selectedDate}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTransfers(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransfers();
  }, [selectedDate]);

  const handleCreateTransfer = () => {
    navigate('/restock');
  };

  const handleDelete = (transferId: string) => {
    // TODO: Implement API call for deletion
    alert(`(ยังไม่ได้ทำ) ลบรายการ: ${transferId}`);
  };

  const handleView = (transfer: any) => {
    navigate(`/transfers/${transfer.id}`, { state: { transferDetails: transfer } });
  };

  // TODO: Implement client-side filtering for transferNumber if needed, 
  // or create a new API endpoint for server-side search.
  const filteredTransfers = transfers.filter(t => 
    t.transfer_no.toLowerCase().includes(transferNumber.toLowerCase())
  );

  return (
    <div>
      <NavigationBar />
      <Container className="mt-4">
        <Row className="mb-3">
          <Col md={4}>
            <Form.Group controlId="filterTransferNumber">
              <Form.Label>ເລກທີ່ຂໍໂອນ:</Form.Label>
              <Form.Control
                type="text"
                placeholder="ຄົ້ນຫາເລກທີ່ຂໍໂອນ"
                value={transferNumber}
                onChange={(e) => setTransferNumber(e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group controlId="filterDate">
              <Form.Label>ວັນທີເດືອນປີ:</Form.Label>
              <Form.Control
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={4} className="d-flex align-items-end justify-content-end">
            <Button variant="success" onClick={handleCreateTransfer}>
              ສ້າງຂໍ
            </Button>
          </Col>
        </Row>

        <h2>ລາຍການຂໍ</h2>
        {loading ? (
          <div className="text-center">
            <Spinner animation="border" />
            <p>ກຳລັງໂຫຼດຂໍ້ມູນຂອງວັນທີ {selectedDate}...</p>
          </div>
        ) : error ? (
          <p style={{ color: 'red' }}>เกิดข้อผิดพลาด: {error}</p>
        ) : (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>ວັນທີເວລາຂໍ</th>
                <th>ເລກທີ່ຂໍ</th>
                <th>ຈຳນວນຂໍ</th>
                <th>ຜູ້ສ້າງ</th>
                <th>ສະຖານະ</th>
                <th>ຈັດການ</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center">ບໍ່ມີລາຍການຂໍໃນວັນທີ່ເລືອກ</td>
                </tr>
              ) : (
                filteredTransfers.map((transfer) => (
                  <tr key={transfer.id}>
                    <td>{transfer.doc_date_time}</td>
                    <td>{transfer.transfer_no}</td>
                    <td>{Math.round(transfer.quantity || 0)}</td>
                    <td>{transfer.creator}</td>
                    <td>
                      <span 
                        className={`badge ${
                          transfer.status_name === 'ໂອນສຳເລັດ' 
                            ? 'bg-success' 
                            : transfer.status_name === 'ລໍຖ້າໂອນ' 
                            ? 'bg-warning text-dark' 
                            : 'bg-secondary'
                        }`}
                      >
                        {transfer.status_name || 'ບໍ່ມີຂໍ້ມູນ'}
                      </span>
                    </td>
                    <td>
                      <Button variant="info" size="sm" className="me-2" onClick={() => handleView(transfer)}>
                        ເບິ່ງ
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(transfer.id)}>
                        ລຶບ
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}
      </Container>
    </div>
  );
};

export default TransferPage;