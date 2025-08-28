import React from 'react';
import { Container, Row, Col, Table, Button, Card } from 'react-bootstrap';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import NavigationBar from './NavigationBar';

const TransferDetailsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { transferId } = useParams<{ transferId: string }>();

  // The full transfer object is passed via navigation state
  const { transferDetails } = location.state || {};

  if (!transferDetails) {
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
        <h2>ລາຍລະອຽດຂໍ້ໂອນ: {transferDetails.transfer_no}</h2>
        <Card className="mb-4">
          <Card.Body>
            <Row>
              <Col md={6}>
                <strong>ເລກທີ່ຂໍ້ໂອນ:</strong> {transferDetails.transfer_no}
              </Col>
              <Col md={6}>
                <strong>ວັນທີເວລາ:</strong> {transferDetails.doc_date_time}
              </Col>
              <Col md={6}>
                <strong>ผู้สร้าง:</strong> {transferDetails.creator}
              </Col>
              <Col md={6}>
                <strong>ຈຳນວນທັງໝົດ:</strong> {transferDetails.quantity} ชิ้น
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
            </tr>
          </thead>
          <tbody>
            {transferDetails.details?.map((item: any) => (
              <tr key={item.item_code}>
                <td>{item.item_code}</td>
                <td>{item.item_name}</td>
                <td>{item.unit_code}</td>
                <td>{item.quantity}</td>
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
