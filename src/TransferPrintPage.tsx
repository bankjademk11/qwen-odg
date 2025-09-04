import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Table, Button, Card, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import './TransferPrintPage.css'; // We will create this CSS file for print styles

const TransferPrintPage: React.FC = () => {
  const [transfer, setTransfer] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const MIN_ROWS = 20;

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

  const emptyRows = Math.max(0, MIN_ROWS - (transfer.details?.length || 0));

  return (
    <div className="print-container">
        <div className="no-print my-3">
            <Button variant="secondary" onClick={() => navigate('/transfers')}>&larr; ກັບໄປລາຍການຂໍໂອນ</Button>
        </div>
        <Card className="p-4 print-card">
            <header className="bill-header mb-4">
                <Row className="align-items-center">
                    <Col xs={3} className="text-start">
                        <img src="/image/logo.png" alt="Company Logo" className="company-logo" />
                    </Col>
                    <Col xs={9} className="text-start">
                        <h4 className="company-name">ໂອດ່ຽນກຸບ ສຳນັກງານໃຫຍ່</h4>
                        <p className="company-address mb-0">ບ. ຂົວຫຼວງ ມ.ຈັນທະບູລິ ນະຄອນຫຼວງວຽງຈັນ</p>
                        <p className="company-contact mb-0">Tel:(+856-21)412663, 450443,263412, fax:263411</p>
                        <p className="company-contact mb-0">info@odien.net</p>
                    </Col>
                </Row>
                <div className="header-divider"></div> {/* New divider */}
                <h2 className="text-center mt-4">ໃບຂໍໂອນສິນຄ້າ</h2> {/* Main bill title, now placeholder */}
            </header>
            <main className="bill-main">
                <Row className="mb-2">
                    <Col md={7} className="transfer-meta-info">
                        <Row>
                            <Col xs={6}><strong>ເລກທີ່ຂໍໂອນ:</strong></Col>
                            <Col xs={6}>{transfer.transfer_no || transfer.doc_no || 'ບໍ່ມີຂໍ້ມູນ'}</Col>
                        </Row>
                        <Row>
                            <Col xs={6}><strong>ວັນທີເວລາ:</strong></Col>
                            <Col xs={6}>{transfer.doc_date_time_formatted}</Col>
                        </Row>
                        <Row>
                            <Col xs={6}><strong>ຜູ້ສ້າງ:</strong></Col>
                            <Col xs={6}>{transfer.creator_name || 'N/A'}</Col>
                        </Row>
                    </Col>
                    <Col md={5} className="warehouse-info">
                        <Row>
                            <Col><strong>ຈາກສາງ:</strong> <span className="warehouse-name">{transfer.wh_from_name || 'N/A'}</span></Col>
                        </Row>
                        <Row>
                            <Col><small>{transfer.location_from_name || 'N/A'}</small></Col>
                        </Row>
                        <Row>
                            <Col><strong>ໄປສາງ:</strong> <span className="warehouse-name">{transfer.wh_to_name || 'N/A'}</span></Col>
                        </Row>
                        <Row>
                            <Col><small>{transfer.location_to_name || 'N/A'}</small></Col>
                        </Row>
                    </Col>
                </Row>

                <Table bordered responsive className="mt-3">
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
                        {Array.from({ length: emptyRows }).map((_, index) => (
                            <tr key={`empty-${index}`}>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
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
            <div className="footer-divider"></div>
            <footer className="mt-auto bill-footer">
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
