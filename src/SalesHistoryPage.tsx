import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Form, Button, ListGroup, Modal } from 'react-bootstrap';
import NavigationBar from './NavigationBar';

interface CartItem {
  item_code: string;
  item_name: string;
  price: number;
  qty: number;
}

interface ReceiptData {
  doc_no: string;
  doc_date: string;
  customer_name: string;
  total_amount: number;
  amount_received: number;
  change_amount: number;
  payment_method: string;
  items: CartItem[];
}

const SalesHistoryPage: React.FC = () => {
  const [allReceipts, setAllReceipts] = useState<ReceiptData[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<ReceiptData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => {
    const savedReceipts = JSON.parse(localStorage.getItem('posReceiptsFlask') || '[]');
    setAllReceipts(savedReceipts);
    setFilteredReceipts(savedReceipts);
  }, []);

  useEffect(() => {
    let currentReceipts = [...allReceipts];

    // Filter by date
    if (selectedDate) {
      currentReceipts = currentReceipts.filter(receipt => {
        const receiptDate = new Date(receipt.doc_date).toISOString().split('T')[0];
        return receiptDate === selectedDate;
      });
    }

    // Filter by search term (customer name or doc_no)
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      currentReceipts = currentReceipts.filter(receipt => 
        receipt.customer_name.toLowerCase().includes(lowerCaseSearchTerm) ||
        receipt.doc_no.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }

    setFilteredReceipts(currentReceipts);
  }, [allReceipts, selectedDate, searchTerm]);

  const handleViewDetails = (receipt: ReceiptData) => {
    setSelectedReceipt(receipt);
    setShowDetailModal(true);
  };

  return (
    <>
      <NavigationBar />
      <Container className="mt-4">
        <h2>ປະຫວັດການຂາຍ (Sales History)</h2>

        <Card className="mb-3">
          <Card.Body>
            <Row>
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
                <Form.Group controlId="formSearch">
                  <Form.Label>ຄົ້ນຫາ (ລູກຄ້າ/ເລກບິນ):</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="ຄົ້ນຫາ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={4} className="d-flex align-items-end">
                <Button variant="secondary" onClick={() => {
                  setSelectedDate('');
                  setSearchTerm('');
                }}>
                  ລ້າງການຄົ້ນຫາ
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>ລາຍການບິນ</Card.Header>
          <Card.Body>
            {filteredReceipts.length === 0 ? (
              <p className="text-center text-muted">ບໍ່ພົບຂໍ້ມູນການຂາຍ</p>
            ) : (
              <ListGroup variant="flush">
                {filteredReceipts.map(receipt => (
                  <ListGroup.Item 
                    key={receipt.doc_no} 
                    className="d-flex justify-content-between align-items-center"
                    action onClick={() => handleViewDetails(receipt)}
                  >
                    <div>
                      <div className="fw-bold">ເລກບິນ: {receipt.doc_no}</div>
                      <small className="text-muted">ວັນທີ: {receipt.doc_date}</small><br/>
                      <small className="text-muted">ລູກຄ້າ: {receipt.customer_name}</small>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold">{receipt.total_amount.toLocaleString()} ₭</div>
                      <small className="text-muted">{receipt.items.length} ລາຍການ</small>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card.Body>
        </Card>
      </Container>

      {/* Receipt Detail Modal */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>ລາຍລະອຽດບິນ (Bill Details)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReceipt && (
            <div>
              <p><strong>ເລກບິນ:</strong> {selectedReceipt.doc_no}</p>
              <p><strong>ວັນທີ:</strong> {selectedReceipt.doc_date}</p>
              <p><strong>ລູກຄ້າ:</strong> {selectedReceipt.customer_name}</p>
              <hr />
              <h6>ລາຍການສິນຄ້າ:</h6>
              <ListGroup variant="flush">
                {selectedReceipt.items.map((item: CartItem) => (
                  <ListGroup.Item key={item.item_code} className="d-flex justify-content-between">
                    <span>{item.item_name} x {item.qty}</span>
                    <span>{item.price.toLocaleString()} ₭</span>
                  </ListGroup.Item>
                ))}
              </ListGroup>
              <hr />
              <div className="d-flex justify-content-between fw-bold">
                <span>ລວມທັງໝົດ:</span>
                <span>{selectedReceipt.total_amount.toLocaleString()} ₭</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>ເງິນທີ່ຮັບມາ:</span>
                <span>{selectedReceipt.amount_received.toLocaleString()} ₭</span>
              </div>
              <div className="d-flex justify-content-between fw-bold text-success">
                <span>ເງິນທອນ:</span>
                <span>{selectedReceipt.change_amount.toLocaleString()} ₭</span>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            ປິດ
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default SalesHistoryPage;