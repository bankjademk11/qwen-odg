import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Button, Card, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import NavigationBar from './NavigationBar';

const TransferDetailsPage: React.FC = () => {
  const [transfer, setTransfer] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { transferId } = useParams<{ transferId: string }>();

  useEffect(() => {
    const fetchTransferDetails = async () => {
      if (!transferId) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:3001/api/transfers/${transferId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTransfer(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransferDetails();
  }, [transferId]);

  if (loading) {
    return (
      <div>
        <NavigationBar />
        <Container className="mt-4 text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p>ກຳລັງໂຫຼດຂໍ້ມູນ...</p>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <NavigationBar />
        <Container className="mt-4">
          <h2>ເກີດຂໍ້ຜິດພາດ</h2>
          <p>{error}</p>
          <Button variant="primary" onClick={() => navigate('/transfers')}>ກັບໄປ</Button>
        </Container>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div>
        <NavigationBar />
        <Container className="mt-4">
          <h2>ບໍ່ພົບຂໍ້ມູນການໂອນ</h2>
          <p>ບໍ່ສາມາດໂຫລດລາຍລະອຽດໄດ້. ກະລຸນາກັບไปທີ່ລາຍການຂໍ້ໂອນ.</p>
          <Button variant="primary" onClick={() => navigate('/transfers')}>ກັບໄປ</Button>
        </Container>
      </div>
    );
  }

  return (
    <div>
      <NavigationBar />
      <Container className="mt-4">
        <h2>ລາຍລະອຽດຂໍ້ໂອນ: {transfer.transfer_no}</h2>
        <Card className="mb-4">
          <Card.Body>
            <Row>
              <Col md={6}>
                <strong>ເລກທີ່ຂໍ້ໂອນ:</strong> {transfer.transfer_no}
              </Col>
              <Col md={6}>
                <strong>ວັນທີເວລາ:</strong> {transfer.doc_date_time}
              </Col>
              <Col md={6}>
                <strong>ผู้สร้าง:</strong> {transfer.creator}
              </Col>
              <Col md={6}>
                <strong>ຈຳນວນທັງໝົດ:</strong> {Math.round(transfer.quantity || 0)} ชิ้น
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <h3>ລາຍການສິນຄ້າ</h3>
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>ລະຫັດສິນຄ້າ</th>
              <th>ຊື່ສິນຄ້າ</th>
              <th>ປະເພດສິນຄ້າ</th>
              <th>ຈຳນວນ</th>
              <th>ต้นทาง</th>
              <th>ปลายทาง</th>
            </tr>
          </thead>
          <tbody>
            {transfer.details?.map((item: any) => (
              <tr key={item.item_code}>
                <td>{item.item_code}</td>
                <td>{item.item_name}</td>
                <td>{item.unit_code}</td>
                <td>{Math.round(parseFloat(item.qty))}</td>
                <td>{item.wh_code} {item.shelf_code}</td>
                <td>{item.wh_code_2} {item.shelf_code_2}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Button variant="secondary" onClick={() => navigate('/transfers')}>
          &larr; ກັບไปที่ລາຍການຂໍ້ໂອນ
        </Button>
      </Container>
    </div>
  );
};

export default TransferDetailsPage;