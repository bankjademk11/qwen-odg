import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Table, Button, Card, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import './TransferPrintPage.css'; // We will create this CSS file for print styles

const TransferPrintPage: React.FC = () => {
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

  // Automatically trigger print dialog once data is loaded
  useEffect(() => {
    if (!loading && transfer) {
      window.print();
    }
  }, [loading, transfer]);

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" />
        <p>ກຳລັງໂຫຼດຂໍ້ມູນໃບບິນ...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <div className="no-print">
            <h2>ເກີດຂໍ້ຜິດພາດ</h2>
            <p>{error}</p>
            <Button variant="primary" onClick={() => navigate('/transfers')}>ກັບໄປ</Button>
        </div>
      </Container>
    );
  }

  if (!transfer) {
    return (
      <Container className="mt-4">
        <div className="no-print">
            <h2>ບໍ່ພົບຂໍ້ມູນການໂອນ</h2>
            <Button variant="primary" onClick={() => navigate('/transfers')}>ກັບໄປ</Button>
        </div>
      </Container>
    );
  }

  return (
    <div className="print-container">
        <div className="no-print my-3">
            <Button variant="secondary" onClick={() => navigate('/transfers')}>&larr; ກັບໄປລາຍການຂໍໂອນ</Button>
        </div>
        <Card className="p-4">
            <header className="text-center mb-4">
                <h2>ໃບຂໍໂອນສິນຄ້າ</h2>
            </header>
            <main>
                <Row className="mb-3">
                    <Col>
                        <strong>ເລກທີ່ຂໍໂອນ:</strong> {transfer.transfer_no || transfer.doc_no || 'ບໍ່ມີຂໍ້ມູນ'}
                    </Col>
                    <Col className="text-end">
                        <strong>ວັນທີເວລາ:</strong> {transfer.doc_date_time_formatted}
                    </Col>
                </Row>
                <Row className="mb-3">
                    <Col>
                        <strong>ຜູ້ສ້າງ:</strong> {transfer.creator_name || 'N/A'}
                    </Col>
                </Row>
                <Card className="mb-3">
                    <Card.Body>
                        <Row>
                            <Col>
                                <strong>ຈາກສາງ:</strong>
                                <p className="mb-0">{transfer.wh_from_name || 'N/A'}</p>
                                <small>{transfer.location_from_name || 'N/A'}</small>
                            </Col>
                            <Col>
                                <strong>ໄປສາງ:</strong>
                                <p className="mb-0">{transfer.wh_to_name || 'N/A'}</p>
                                <small>{transfer.location_to_name || 'N/A'}</small>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                <h5>ລາຍການສິນຄ້າ</h5>
                <Table bordered responsive>
                    <thead className="table-light">
                        <tr>
                            <th>ລະຫັດສິນຄ້າ</th>
                            <th>ຊື່ສິນຄ້າ</th>
                            <th>ໜ່ວຍ</th>
                            <th className="text-end">ຈຳນວນ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transfer.details?.map((item: any) => (
                        <tr key={item.item_code}>
                            <td>{item.item_code}</td>
                            <td>{item.item_name}</td>
                            <td>{item.unit_code}</td>
                            <td className="text-end">{Math.round(parseFloat(item.qty))}</td>
                        </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="table-light">
                            <td colSpan={2} className="text-end"><strong>ຈຳນວນທັງໝົດ:</strong></td>
                            <td></td> {/* Empty cell for the swapped 'unit' column */}
                            <td className="text-end"><strong>{Math.round(transfer.quantity || 0)}</strong></td>
                        </tr>
                    </tfoot>
                </Table>
            </main>
            <footer className="mt-5">
                <Row>
                    <Col className="text-center">
                        <p>_________________________</p>
                        <p>( ຜູ້ຂໍໂອນ )</p>
                    </Col>
                    <Col className="text-center">
                        <p>_________________________</p>
                        <p>( ຜູ້ອະນຸມັດ )</p>
                    </Col>
                </Row>
            </footer>
        </Card>
    </div>
  );
};

export default TransferPrintPage;
