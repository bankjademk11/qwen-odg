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
    console.log('Transfer ID from URL params:', transferId);
    
    const fetchTransferDetails = async () => {
      if (!transferId) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${import.meta.env.VITE_FASTAPI_URL}/api/transfers/${transferId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Transfer data received:', data);
        setTransfer(data);
      } catch (e: any) {
        console.error('Error fetching transfer details:', e);
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
        <h2>ລາຍລະອຽດຂໍໂອນ: {transfer.transfer_no || transfer.doc_no || transfer.id || 'ບໍ່ມີຂໍ້ມູນ'}</h2>
        <Card className="mb-4">
          <Card.Body>
            <Row>
              <Col md={6}>
                <strong>ເລກທີ່ຂໍໂອນ:</strong> {transfer.transfer_no || transfer.doc_no || transfer.id || 'ບໍ່ມີຂໍ້ມູນ'}
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
                <strong>ຕົ້ນທາງ:</strong> {transfer.wh_from_name || transfer.wh_from || 'ບໍ່ມີຂໍ້ມູນ'} - {transfer.location_from_name || transfer.location_from || 'ບໍ່ມີຂໍ້ມູນ'}
              </Col>
              <Col md={6}>
                <strong>ປາຍທາງ:</strong> {transfer.wh_to_name || transfer.wh_to || 'ບໍ່ມີຂໍ້ມູນ'} - {transfer.location_to_name || transfer.location_to || 'ບໍ່ມີຂໍ້ມູນ'}
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
              <th>ຫົວໜ່ວຍ</th>
              <th>ຈຳນວນ</th>
            </tr>
          </thead>
          <tbody>
            {transfer.details?.map((item: any) => (
              <tr key={item.item_code}>
                <td>{item.item_code}</td>
                <td>{item.item_name}</td>
                <td>{item.unit_code}</td>
                <td>{Math.round(parseFloat(item.qty))}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Container>
    </div>
  );
};

export default TransferDetailsPage;