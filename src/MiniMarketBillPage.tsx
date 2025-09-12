import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';

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

const MiniMarketBillPage: React.FC = () => {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => {
    const savedReceipt = sessionStorage.getItem('currentReceipt');
    if (savedReceipt) {
      setReceipt(JSON.parse(savedReceipt));
    }
  }, []);

  if (!receipt) {
    return <Container className="mt-5 text-center"><h2>ບໍ່ພົບຂໍ້ມູນໃບຮັບເງິນ</h2><p>ກະລຸນາກັບໄປທີ່ໜ້າ POS ເພື່ອສ້າງໃບຮັບເງິນ.</p></Container>;
  }

  return (
    <Container className="mini-bill-page p-3" style={{ maxWidth: '300px', margin: '20px auto', border: '1px solid #ccc', fontFamily: 'monospace', fontSize: '0.8em' }}>
      <div className="text-center mb-3">
        <img src="/image/logo.png" alt="Logo" style={{ width: '80px', height: 'auto', marginBottom: '10px' }} />
        <h5>ຮ້ານຂາຍເຄື່ອງ</h5>
        <p>ໃບຮັບເງິນ</p>
        <p>--------------------------------</p>
      </div>

      <Row className="mb-2">
        <Col xs={6}><strong>ເລກບິນ:</strong></Col>
        <Col xs={6} className="text-end">{receipt.doc_no}</Col>
        <Col xs={6}><strong>ວັນທີ:</strong></Col>
        <Col xs={6} className="text-end">{receipt.doc_date}</Col>
        <Col xs={6}><strong>ລູກຄ້າ:</strong></Col>
        <Col xs={6} className="text-end">{receipt.customer_name}</Col>
        <Col xs={6}><strong>ວິທີຊຳລະ:</strong></Col>
        <Col xs={6} className="text-end">{receipt.payment_method}</Col>
        <Col xs={12}><p>--------------------------------</p></Col>
      </Row>

      {receipt.items.map((item, index) => (
        <Row key={index} className="bill-item">
          <Col xs={12}><strong>{item.item_name}</strong></Col>
          <Col xs={6}>{item.qty} x {item.price.toLocaleString()} ₭</Col>
          <Col xs={6} className="text-end">{(item.qty * item.price).toLocaleString()} ₭</Col>
        </Row>
      ))}

      <Row className="mt-2">
        <Col xs={12}><p>--------------------------------</p></Col>
        <Col xs={6}><strong>ລວມທັງໝົດ:</strong></Col>
        <Col xs={6} className="text-end"><strong>{receipt.total_amount.toLocaleString()} ₭</strong></Col>
        <Col xs={6}>ເງິນທີ່ຮັບມາ:</Col>
        <Col xs={6} className="text-end">{receipt.amount_received.toLocaleString()} ₭</Col>
        <Col xs={6}>ເງິນທອນ:</Col>
        <Col xs={6} className="text-end">{receipt.change_amount.toLocaleString()} ₭</Col>
        <Col xs={12}><p>--------------------------------</p></Col>
      </Row>

      <div className="text-center mt-3">
        <p>ຂອບໃຈທີ່ໃຊ້ບໍລິການ!</p>
        <Button variant="primary" onClick={() => window.print()} className="d-print-none">ພິມໃບຮັບເງິນ</Button>
      </div>
    </Container>
  );
};

export default MiniMarketBillPage;