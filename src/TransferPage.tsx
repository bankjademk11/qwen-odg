import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Table, Button, Form, Modal, ListGroup } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import NavigationBar from './NavigationBar';

const TRANSFERS_STORAGE_KEY = 'appTransfers'; // Define a key for localStorage

const TransferPage: React.FC = () => {
  // Load transfers from localStorage on initial render, or start with an empty array
  const [transfers, setTransfers] = useState(() => {
    try {
      const storedTransfers = localStorage.getItem(TRANSFERS_STORAGE_KEY);
      return storedTransfers ? JSON.parse(storedTransfers) : [];
    } catch (error) {
      console.error("Failed to parse transfers from localStorage", error);
      return [];
    }
  });

  const [transferNumber, setTransferNumber] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // State for the View Details Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const processedTransferIdRef = useRef<number | null>(null);

  // Save transfers to localStorage whenever the state changes
  useEffect(() => {
    try {
      localStorage.setItem(TRANSFERS_STORAGE_KEY, JSON.stringify(transfers));
    } catch (error) {
      console.error("Failed to save transfers to localStorage", error);
    }
  }, [transfers]);

  // Effect to handle receiving a new transfer from the Restock page
  useEffect(() => {
    const newTransfer = location.state?.newTransfer;

    // Use a ref to prevent duplicate additions from React.StrictMode double-invokes
    if (newTransfer && newTransfer.id !== processedTransferIdRef.current) {
      setTransfers(prevTransfers => [newTransfer, ...prevTransfers]);
      
      // Mark this transfer ID as processed
      processedTransferIdRef.current = newTransfer.id;
      
      // Clear the state from location to prevent re-adding on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const handleCreateTransfer = () => {
    navigate('/restock');
  };

  const handleDelete = (transferId: number) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?')) {
      setTransfers(prevTransfers => prevTransfers.filter(t => t.id !== transferId));
    }
  };

  const handleView = (transfer: any) => {
    setSelectedTransfer(transfer);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTransfer(null);
  };

  return (
    <div>
      <NavigationBar />
      <Container className="mt-4">
        <Row className="mb-3">
          <Col md={4}>
            <Form.Group controlId="filterTransferNumber">
              <Form.Label>ເລກທີ່ຂໍ້ໂອນ:</Form.Label>
              <Form.Control
                type="text"
                placeholder="ຄົ້ນຫາເລກທີ່ຂໍ້ໂອນ"
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
              ສ້າງຂໍ້ໂອນ
            </Button>
          </Col>
        </Row>

        <h2>ລາຍການຂໍ້ໂອນ</h2>
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>ວັນທີເວລາຂໍ້ໂອນ</th>
              <th>ເລກທີ່ຂໍ້ໂອນ</th>
              <th>ຈຳນວນຂໍ້ໂອນ</th>
              <th>ຜູ້ສ້າງ</th>
              <th>ຈັດການ</th>
            </tr>
          </thead>
          <tbody>
            {transfers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center">ບໍ່ມີລາຍການຂໍ້ໂອນ</td>
              </tr>
            ) : (
              transfers.map((transfer) => (
                <tr key={transfer.id}>
                  <td>{transfer.doc_date_time}</td>
                  <td>{transfer.transfer_no}</td>
                  <td>{transfer.quantity}</td>
                  <td>{transfer.creator}</td>
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
      </Container>

      {/* View Details Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>ລາຍລະອຽດຂໍ້ໂອນ: {selectedTransfer?.transfer_no}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTransfer?.details && selectedTransfer.details.length > 0 ? (
            <ListGroup variant="flush">
              {selectedTransfer.details.map((item: any) => (
                <ListGroup.Item key={item.item_code} className="d-flex justify-content-between align-items-start">
                  <div className="ms-2 me-auto">
                    <div className="fw-bold">{item.item_name}</div>
                    <small className="text-muted">{item.item_code}</small>
                  </div>
                  <span className="badge bg-primary rounded-pill">{item.quantity} {item.unit_code}</span>
                </ListGroup.Item>
              ))}
            </ListGroup>
          ) : (
            <p>ບໍ່ມີລາຍລະອຽດສິນຄ້າ</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            ปิด
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TransferPage;