import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import './MiniMarketBillPage.css'; // Import the new CSS file

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

// Helper function to safely format numbers
const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null) {
    return '0';
  }
  return value.toLocaleString();
};

const MiniMarketBillPage: React.FC = () => {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => {
    const savedReceipt = sessionStorage.getItem('currentReceipt');
    if (savedReceipt) {
      setReceipt(JSON.parse(savedReceipt));
    }
  }, []);

  if (!receipt) {
    return (
      <div className="receipt-container">
        <Container className="mt-5 text-center">
          <h2>ບໍ່ພົບຂໍ້ມູນໃບຮັບເງິນ</h2>
          <p>ກະລຸນາກັບໄປທີ່ໜ້າ POS ເພື່ອສ້າງໃບຮັບເງິນ.</p>
        </Container>
      </div>
    );
  }

  return (
    <div className="receipt-container">
      <div className="receipt-header no-print">
        <Container className="bill-page-container p-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Button variant="secondary" onClick={() => window.close()}>
              <i className="bi bi-arrow-left me-2"></i>
              ກັບຄືນ
            </Button>
            <Button variant="primary" onClick={() => window.print()}>
              <i className="bi bi-printer me-2"></i>
              ພິມໃບຮັບເງິນ
            </Button>
          </div>
        </Container>
      </div>

      <div className="receipt-content">
        <div className="receipt-header-info text-center">
          <div className="company-logo-placeholder">
            <div className="logo-text">ODIEN MALL</div>
          </div>
          <h2 className="receipt-title">ໃບຮັບເງິນ</h2>
          <p className="receipt-subtitle">RECEIPT</p>
        </div>

        <div className="receipt-details">
          <div className="detail-row">
            <span className="label">ເລກບິນ:</span>
            <span className="value">{receipt.doc_no}</span>
          </div>
          <div className="detail-row">
            <span className="label">ວັນທີ:</span>
            <span className="value">{receipt.doc_date}</span>
          </div>
          <div className="detail-row">
            <span className="label">ລູກຄ້າ:</span>
            <span className="value">{receipt.customer_name}</span>
          </div>
          <div className="detail-row">
            <span className="label">ວິທີຊຳລະ:</span>
            <span className="value">
              {receipt.payment_method === 'cash' ? 'ເງິນສົດ' : 
               receipt.payment_method === 'transfer' ? 'ໂອນຈ່າຍ' : 
               receipt.payment_method}
            </span>
          </div>
        </div>

        <div className="divider"></div>

        <div className="items-header">
          <div className="item-desc">ລາຍການສິນຄ້າ</div>
          <div className="item-qty">ຈຳນວນ</div>
          <div className="item-price">ລາຄາ</div>
          <div className="item-total">ລວມ</div>
        </div>

        <div className="items-list">
          {receipt.items && receipt.items.map((item, index) => (
            <div className="item-row" key={index}>
              <div className="item-desc">
                <div className="item-name">{item.item_name}</div>
                <div className="item-details">
                  <span className="item-code">{item.item_code}</span>
                  <span className="item-qty-display">ຈຳນວນ {Number.isInteger(item.qty) ? item.qty : formatCurrency(item.qty)}</span>
                  <span className="item-price-display">ລາຄາ {Number.isInteger(item.price) ? formatCurrency(item.price) : formatCurrency(item.price)} ₭</span>
                </div>
              </div>
              <div className="item-total">{formatCurrency((item.qty || 0) * (item.price || 0))} ₭</div>
            </div>
          ))}
        </div>

        <div className="divider"></div>

        <div className="summary-section">
          <div className="summary-row total">
            <span>ລວມທັງໝົດ:</span>
            <span>{formatCurrency(receipt.total_amount)} ₭</span>
          </div>
          <div className="summary-row">
            <span>ເງິນທີ່ຮັບມາ:</span>
            <span>{formatCurrency(receipt.amount_received)} ₭</span>
          </div>
          <div className="summary-row change">
            <span>ເງິນທອນ:</span>
            <span>{formatCurrency(receipt.change_amount)} ₭</span>
          </div>
        </div>

        <div className="divider"></div>

        <div className="receipt-footer text-center">
          <p className="thank-you">ຂອບໃຈທີ່ໃຊ້ບໍລິການ!</p>
          <p className="thank-you-en">Thank you for your purchase!</p>
        </div>
      </div>
    </div>
  );
};

export default MiniMarketBillPage;