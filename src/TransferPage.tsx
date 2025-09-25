import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Button, Form, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import NavigationBar from './NavigationBar';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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
        const response = await fetch(`${import.meta.env.VITE_FASTAPI_URL}/api/transfers?date=${selectedDate}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Sort transfers by date_time in descending order (latest first)
        const sortedData = data.sort((a: any, b: any) => {
          const dateA = new Date(a.doc_date_time).getTime();
          const dateB = new Date(b.doc_date_time).getTime();
          return dateB - dateA;
        });
        setTransfers(sortedData);
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
    console.log('Transfer data being passed to details page:', transfer);
    navigate(`/transfers/${transfer.id}`, { state: { transferDetails: transfer } });
  };

  // Open edit modal with transfer data
  const handleEdit = (transfer: any) => {
    // Navigate to the new edit page instead of opening modal
    navigate(`/transfers/${transfer.id}/edit`);
  };

  // TODO: Implement client-side filtering for transferNumber if needed, 
  // or create a new API endpoint for server-side search.
  const filteredTransfers = transfers.filter(t => {
    if (!transferNumber) return true;
    
    // Extract the numeric part from transfer number (e.g., "0001" from "FR25010001")
    const transferNo = t.transfer_no || '';
    const numericPart = transferNo.replace(/\D/g, ''); // Remove all non-digit characters
    
    // Also check the full transfer number for partial matches
    return transferNo.toLowerCase().includes(transferNumber.toLowerCase()) || 
           numericPart.includes(transferNumber);
  });

  return (
    <div>
      <NavigationBar />
      <Container className="mt-4">
        <div className="filter-section">
          <Row className="filter-row justify-content-between">
            <Col md={3}>
              <Form.Group controlId="filterTransferNumber" className="mb-1">
                <Form.Label className="mb-1">ເລກທີ່ຂໍໂອນ:</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="ປ້ອນເລກທີ່ (e.g. 0001 ຫຼື FR25010001)"
                  value={transferNumber}
                  onChange={(e) => setTransferNumber(e.target.value)}
                  className="form-control form-control-sm"
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group controlId="filterDate" className="mb-1">
                <Form.Label className="mb-1">ວັນທີເດືອນປີ:</Form.Label>
                <DatePicker
                  selected={selectedDate ? new Date(selectedDate) : null}
                  onChange={(date: Date | null) => setSelectedDate(date ? date.toISOString().split('T')[0] : '')}
                  dateFormat="yyyy-MM-dd"
                  className="form-control form-control-sm"
                  placeholderText="ກະລຸນາເລືອກວັນທີ"
                />
              </Form.Group>
            </Col>
            <Col md={3} className="d-flex align-items-end justify-content-end">
              <Button variant="success" size="sm" onClick={handleCreateTransfer}>
                ສ້າງລາຍການຂໍໂອນ
              </Button>
            </Col>
          </Row>
        </div>

        <h2 className="mt-4">ລາຍການຂໍ</h2>
        {loading ? (
          <div className="text-center">
            <Spinner animation="border" />
            <p>ກຳລັງໂຫຼດຂໍ້ມູນຂອງວັນທີ {selectedDate}...</p>
          </div>
        ) : error ? (
          <p style={{ color: 'red' }}>เกิดຂ้อผิดพลาด: {error}</p>
        ) : (
          <Table striped bordered hover responsive className="mt-3">
            <thead>
              <tr>
                <th>ວັນທີເວລາຂໍ</th>
                <th>ເລກທີ່ຂໍ</th>
                <th>ຈຳນວນຂໍ</th>
                <th>ຜູ້ສ້າງ</th>
                <th className="text-center" style={{ width: '15%' }}>ສະຖານະ</th>
                <th className="text-center" style={{ width: '25%' }}>ຈັດການ</th>
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
                    <td className="text-center align-middle">
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
                    <td className="text-center align-middle">
                      <div className="d-flex justify-content-center">
                        <Button variant="info" size="sm" className="me-2" onClick={() => handleView(transfer)}>
                          ເບິ່ງ
                        </Button>
                        <Button variant="warning" size="sm" className="me-2" onClick={() => handleEdit(transfer)}>
                          ແກ້ໄຂ
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => window.open(`/transfers/${transfer.id}/print`, '_blank')}>
                          <i className="bi bi-printer"></i>
                        </Button>
                      </div>
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