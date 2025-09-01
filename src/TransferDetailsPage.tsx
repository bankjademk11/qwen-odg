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
        const response = await fetch(`http://localhost:8004/api/transfers/${transferId}`);
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
          <p>ບໍ່ສາມາດໂຫລດລາຍລະອຽດໄດ້. ກະລຸນາກັບไปທີ່ລາຍການຂໍ.</p>
          <Button variant="primary" onClick={() => navigate('/transfers')}>ກັບໄປ</Button>
        </Container>
      </div>
    );
  }

  return (
    <div>
      <NavigationBar />
      <Container className="mt-4">
        <h2>ລາຍລະອຽດຂໍໂອນ: {transfer.transfer_no}</h2>
        <Card className="mb-4">
          <Card.Body>
            <Row>
              <Col md={6}>
                <strong>ເລກທີ່ຂໍໂອນ:</strong> {transfer.transfer_no || 'ບໍ່ມີຂໍ້ມູນ'}
              </Col>
              <Col md={6}>
                <strong>ວັນທີເວລາ:</strong> {transfer.doc_date_time || transfer.doc_date_time_formatted || 'ບໍ່ມີຂໍ້ມູນ'}
              </Col>
              <Col md={6}>
                <strong>ຜູ້ສ້າງ:</strong> {transfer.creator_name || transfer.creator || transfer.creator_code || 'ບໍ່ມີຂໍ້ມູນ'}
              </Col>
              <Col md={6}>
                <strong>ຈຳນວນທັງໝົດ:</strong> {Math.round(transfer.quantity || 0)} ຊິ້ນ
              </Col>
              <Col md={6}>
                <strong>ຕົ້ນທາງ:</strong> {transfer.wh_from} - {transfer.location_from}
              </Col>
              <Col md={6}>
                <strong>ປາຍທາງ:</strong> {transfer.wh_to} - {transfer.location_to}
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3>ລາຍການສິນຄ້າ</h3>
          <Button variant="secondary" onClick={() => navigate('/transfers')}>
            &larr; ກັບໄປລາຍການຂໍໂອນ
          </Button>
        </div>
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>ລະຫັດສິນຄ້າ</th>
              <th>ຊື່ສິນຄ້າ</th>
              <th>ປະເພດສິນຄ້າ</th>
              <th>ຈຳນວນ</th>
              <th>ຕົ້ນທາງ</th>
              <th>ປາຍທາງ</th>
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
      </Container>
    </div>
  );
};

export default TransferDetailsPage;