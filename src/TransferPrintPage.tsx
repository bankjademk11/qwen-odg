import React, { useState, useEffect } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import './TransferPrintPage.css'; // We will create this CSS file for print styles

/**
 * @interface TransferDetail
 * @description Represents a single item in the transfer.
 */
interface TransferDetail {
  item_code: string;
  item_name: string;
  unit_code: string;
  qty: string;
}

/**
 * @interface TransferData
 * @description Represents the full structure of the transfer data.
 */
interface TransferData {
  transfer_no: string;
  doc_no: string;
  doc_date_time_formatted: string;
  creator_name: string;
  wh_from_name: string;
  wh_to_name: string;
  details: TransferDetail[];
  quantity: number;
}

const TransferPrintPage = () => {
  const [transfer, setTransfer] = useState<TransferData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false); // New state for image loading
  const MIN_ROWS_PER_PAGE = 30; // จำนวนแถวขั้นต่ำที่ต้องการให้แสดงในแต่ละหน้า

  const navigate = useNavigate();
  const { transferId } = useParams();

  useEffect(() => {
    const fetchTransferDetails = async () => {
      if (!transferId) return;
      setLoading(true);
      setError(null);
      setImageLoaded(false); // Reset imageLoaded on new fetch
      try {
        const response = await fetch(`${import.meta.env.VITE_FASTAPI_URL}/api/transfers/${transferId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTransfer(data);

        // Pre-load the logo image
        const img = new Image();
        img.src = "/image/logo.png";
        img.onload = () => setImageLoaded(true);
        img.onerror = () => {
          console.error("Failed to load logo image.");
          setImageLoaded(true); // Still allow printing even if image fails
        };

      } catch (e: any) {
        setError(e.message);
        setImageLoaded(true); // Allow printing even if data fetch fails
      } finally {
        setLoading(false);
      }
    };

    fetchTransferDetails();
  }, [transferId]);

  // Automatically trigger print dialog once data and image are loaded
  useEffect(() => {
    if (!loading && transfer && imageLoaded) {
      window.print();
    }
  }, [loading, transfer, imageLoaded]);

  if (loading) {
    return (
      <div className="no-print d-flex flex-column align-items-center justify-content-center vh-100">
        <Spinner animation="border" />
        <p className="mt-2">ກຳລັງໂຫຼດຂໍ້ມູນໃບບິນ...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="no-print d-flex flex-column align-items-center justify-content-center vh-100">
        <h2>ເກີດຂໍ້ຜິດພາດ</h2>
        <p>{error}</p>
        <Button variant="primary" onClick={() => navigate('/transfers')}>ກັບໄປ</Button>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="no-print d-flex flex-column align-items-center justify-content-center vh-100">
        <h2>ບໍ່ພົບຂໍ້ມູນການໂອນ</h2>
        <Button variant="primary" onClick={() => navigate('/transfers')}>ກັບໄປ</Button>
      </div>
    );
  }

  const emptyRows = Math.max(0, MIN_ROWS_PER_PAGE - (transfer.details?.length || 0));

  return (
    <div className="print-container">
        <div className="no-print my-3">
            <Button variant="secondary" onClick={() => navigate('/transfers')}>&larr; ກັບໄປລາຍການຂໍໂອນ</Button>
        </div>
        <div className="print-card">
            <header className="bill-header">
                <div className="header-info">
                    <img src="/image/logo.png" alt="Company Logo" className="company-logo" />
                    <div className="company-details">
                        <h4 className="company-name">ໂອດ່ຽນກຸບ ສໍານັກງານໃຫຍ່</h4>
                        <p className="company-address">ບ. ຂົວຫຼວງ ມ.ຈັນທະບູລິ ນະຄອນຫຼວງວຽງຈັນ</p>
                        <p className="company-contact">Tel:(+856-21)412663, 450443,263412, fax:263411</p>
                        <p className="company-contact">info@odien.net</p>
                    </div>
                </div>
                <h2 className="bill-title">ໃບຂໍໂອນສິນຄ້າ</h2>
            </header>
            <div className="header-meta-info">
                <div className="meta-group">
                    <div className="meta-row">
                        <span>ເລກທີ່ຂໍໂອນ:</span>
                        <span className="meta-value">{transfer.transfer_no || transfer.doc_no || 'ບໍ່ມີຂໍ້ມູນ'}</span>
                    </div>
                    <div className="meta-row">
                        <span>ວັນທີເວລາ:</span>
                        <span className="meta-value">{transfer.doc_date_time_formatted}</span>
                    </div>
                    <div className="meta-row">
                        <span>ຜູ້ສ້າງ:</span>
                        <span className="meta-value">{transfer.creator_name || 'N/A'}</span>
                    </div>
                </div>
                <div className="meta-group">
                    <div className="meta-row">
                        <span>ຈາກສາງ:</span>
                        <span className="meta-value warehouse-name">{transfer.wh_from_name || 'N/A'}</span>
                    </div>
                    <div className="meta-row">
                        <span>ໄປສາງ:</span>
                        <span className="meta-value warehouse-name">{transfer.wh_to_name || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <main className="bill-main">
                <table className="table">
                    <thead>
                        <tr>
                            <th>ລະຫັດສິນຄ້າ</th>
                            <th>ຊື່ສິນຄ້າ</th>
                            <th>ໜ່ວຍ</th>
                            <th className="text-end">ຈໍານວນ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transfer.details?.map((item: TransferDetail, index: number) => (
                            <tr key={index}>
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
                        <tr>
                            <td colSpan={3} className="text-end total-label">ຈຳນວນທັງໝົດ:</td>
                            <td className="text-end total-value">{Math.round(transfer.quantity || 0)}</td>
                        </tr>
                    </tfoot>
                </table>
            </main>
            
            <footer className="bill-footer">
                <div className="note-section">
                    <p className="note-text">ໝາຍເຫດ: ໃຫ້ແຍກໃບຮັບໂອນສິນຄ້າຕາມສາງຜູ້ຮັບ</p>
                    <div className="total-summary">
                        <span>ຈຳນວນ:</span>
                        <span className="total-amount">{Math.round(transfer.quantity || 0)}</span>
                    </div>
                </div>
                <div className="signature-section">
                    <div className="signature-box">
                        <p className="signature-line"></p>
                        <p className="signature-label">( ຜູ້ຂໍໂອນ )</p>
                    </div>
                    <div className="signature-box">
                        <p className="signature-line"></p>
                        <p className="signature-label">( ຜູ້ອະນຸມັດ )</p>
                    </div>
                </div>
            </footer>
        </div>
    </div>
  );
};

export default TransferPrintPage;
