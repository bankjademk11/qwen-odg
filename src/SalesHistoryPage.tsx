import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Form, Button, ListGroup, Modal, Spinner, Alert } from 'react-bootstrap';
import NavigationBar from './NavigationBar';
import { useNavigate } from 'react-router-dom';
import './SalesHistoryPage.css'; // Import the new CSS file

// Helper function to safely format numbers
const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null) {
    return '0';
  }
  return value.toLocaleString();
};

interface CartItem {
  item_code: string;
  item_name: string;
  price: number;
  qty: number;
  unit_code?: string;
}

interface SalesHistoryItem {
  doc_no: string;
  doc_date: string;
  doc_time: string;
  cust_code: string;
  total_amount_2: number;
  currency_code: string;
  currency_symbol: string;
  customer_name: string;
  items: CartItem[];
}

const ITEMS_PER_PAGE = 20;

const SalesHistoryPage = () => {
  const navigate = useNavigate();
  const [salesHistory, setSalesHistory] = useState<SalesHistoryItem[]>([]);
  const [selectedSale, setSelectedSale] = useState<SalesHistoryItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [allSales, setAllSales] = useState<SalesHistoryItem[]>([]);
  const [filteredSales, setFilteredSales] = useState<SalesHistoryItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedReceipt, setSelectedReceipt] = useState<SalesHistoryItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchSalesHistory = async (currentOffset: number, currentLimit: number, dateFilter: string, searchFilter: string) => {
    if (currentOffset === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: currentLimit.toString(),
        offset: currentOffset.toString(),
      });

      if (dateFilter) {
        params.append('selectedDate', dateFilter);
      }
      if (searchFilter) {
        params.append('searchTerm', searchFilter);
      }

      const response = await fetch(`${import.meta.env.VITE_FLASK_API_URL}/api/sales-history-db?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const newSales: SalesHistoryItem[] = data.list;
      const newTotalCount: number = data.totalCount;

      setSalesHistory(prevSales => 
        currentOffset === 0 ? newSales : [...prevSales, ...newSales]
      );
      setAllSales(prevSales => 
        currentOffset === 0 ? newSales : [...prevSales, ...newSales]
      );
      setOffset(currentOffset + newSales.length);
      setHasMore(currentOffset + newSales.length < newTotalCount);
      setTotalCount(newTotalCount);

    } catch (e: any) {
      console.error("Failed to fetch sales history:", e);
      setError("ไม่สามารถโหลดประวัติการขายได้. กรุณาลองใหม่อีกครั้ง.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setSalesHistory([]);
    setAllSales([]);
    setOffset(0);
    setHasMore(true);
    fetchSalesHistory(0, ITEMS_PER_PAGE, selectedDate, searchTerm);
  }, [selectedDate, searchTerm]);

  useEffect(() => {
    let currentSales = [...salesHistory];

    if (selectedDate) {
      currentSales = currentSales.filter(sale => {
        const saleDate = new Date(sale.doc_date).toISOString().split('T')[0];
        return saleDate === selectedDate;
      });
    }

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      currentSales = currentSales.filter(sale => 
        sale.customer_name.toLowerCase().includes(lowerCaseSearchTerm) ||
        sale.doc_no.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }

    setFilteredSales(currentSales);
  }, [salesHistory, selectedDate, searchTerm]);

  const handleViewDetails = (sale: SalesHistoryItem) => {
    setSelectedReceipt(sale);
    setShowDetailModal(true);
  };

  const handlePrintReceipt = () => {
    if (selectedSale) {
      // Convert the sales history item to the format expected by MiniMarketBillPage
      const receiptData = {
        doc_no: selectedSale.doc_no,
        doc_date: `${selectedSale.doc_date} ${selectedSale.doc_time}`,
        customer_name: selectedSale.customer_name,
        total_amount: selectedSale.total_amount_2,
        amount_received: selectedSale.total_amount_2, // We don't have this info, so we'll use total_amount
        change_amount: 0, // We don't have this info
        payment_method: 'cash', // We don't have this info
        items: selectedSale.items
      };
      sessionStorage.setItem('currentReceipt', JSON.stringify(receiptData));
      window.open('/receipt-print', '_blank');
    }
  };

  return (
    <>
      <NavigationBar />
      <Container fluid className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0">ປະຫວັດການຂາຍ (Sales History)</h2>
        </div>

        <Row className="mb-3">
          <Col md={3}>
            <Form.Group controlId="filterDate">
              <Form.Label>ກັ່ນຕອງຕາມວັນທີ:</Form.Label>
              <Form.Control
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group controlId="searchTerm">
              <Form.Label>ຄົ້ນຫາ (ເລກບິນ/ລູກຄ້າ):</Form.Label>
              <Form.Control
                type="text"
                placeholder="ຄົ້ນຫາ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={6} className="d-flex align-items-end justify-content-end">
            <Button variant="secondary" onClick={() => {
              setSelectedDate('');
              setSearchTerm('');
            }} className="me-2">
              ລ້າງຕົວກັ່ນຕອງ
            </Button>
            <Button variant="primary" onClick={() => navigate('/pos-flask')}>
              <i className="bi bi-arrow-left me-2"></i>
              ກັບຄືນໜ້າ POS
            </Button>
          </Col>
        </Row>

        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : (
          <Row>
            <Col md={8}>
              <Card>
                <Card.Header>ລາຍການຂາຍ ({totalCount} ລາຍການ)</Card.Header>
                <ListGroup variant="flush">
                  {filteredSales.length > 0 ? (
                    filteredSales.map((sale, index) => (
                      <ListGroup.Item
                        key={index}
                        action
                        onClick={() => setSelectedSale(sale)}
                        active={selectedSale?.doc_no === sale.doc_no}
                      >
                        <div className="d-flex justify-content-between">
                          <div>
                            <strong>ເລກບິນ:</strong> {sale.doc_no} <br />
                            <strong>ລູກຄ້າ:</strong> {sale.customer_name}
                          </div>
                          <div>
                            <strong>ວັນທີ:</strong> {sale.doc_date} {sale.doc_time} <br />
                            <strong>ຈຳນວນ:</strong> {formatCurrency(sale.total_amount_2)} {sale.currency_symbol}
                          </div>
                        </div>
                        {/* Remove the product items display from the list view */}
                      </ListGroup.Item>
                    ))
                  ) : (
                    <ListGroup.Item className="text-center text-muted">
                      ບໍ່ມີປະຫວັດການຂາຍ
                    </ListGroup.Item>
                  )}
                </ListGroup>
                {hasMore && (
                  <div className="text-center mt-3 mb-3">
                    <Button 
                      variant="primary" 
                      onClick={() => fetchSalesHistory(offset, ITEMS_PER_PAGE, selectedDate, searchTerm)}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                      ) : (
                        'ໂຫຼດເພີ່ມເຕີມ'
                      )}
                    </Button>
                  </div>
                )}
              </Card>
            </Col>
            <Col md={4}>
              {selectedSale && (
                <Card>
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    ລາຍລະອຽດບິນ
                    <Button variant="primary" size="sm" onClick={handlePrintReceipt}>
                      <i className="bi bi-printer"></i> Print
                    </Button>
                  </Card.Header>
                  <Card.Body>
                    <div className="sale-details-grid">
                      <div className="detail-row">
                        <span className="detail-label">ເລກບິນ:</span>
                        <span className="detail-value">{selectedSale.doc_no}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">ວັນທີ:</span>
                        <span className="detail-value">{selectedSale.doc_date} {selectedSale.doc_time}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">ລະຫັດລູກຄ້າ:</span>
                        <span className="detail-value">{selectedSale.cust_code}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">ຊື່ລູກຄ້າ:</span>
                        <span className="detail-value">{selectedSale.customer_name}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">ຈຳນວນທັງໝົດ:</span>
                        <span className="detail-value">{formatCurrency(selectedSale.total_amount_2)} {selectedSale.currency_symbol}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">ລະຫັດສະກຸນເງິນ:</span>
                        <span className="detail-value">{selectedSale.currency_code}</span>
                      </div>
                    </div>
                    
                    <h6 className="mt-3">ລາຍການສິນຄ້າ:</h6>
                    <ListGroup variant="flush">
                      {selectedSale.items && selectedSale.items.map((item, idx) => (
                        <ListGroup.Item key={idx} className="item-detail-row">
                          <div className="item-name">{item.item_name}</div>
                          <div className="item-details-grid">
                            <div className="item-detail">
                              <span className="detail-label">ລະຫັດ:</span>
                              <span className="detail-value">{item.item_code}</span>
                            </div>
                            <div className="item-detail">
                              <span className="detail-label">ຈຳນວນ:</span>
                              <span className="detail-value">
                                {Number.isInteger(item.qty) ? item.qty : formatCurrency(item.qty)}
                              </span>
                            </div>
                            <div className="item-detail">
                              <span className="detail-label">ລາຄາ:</span>
                              <span className="detail-value">
                                {Number.isInteger(item.price) ? formatCurrency(item.price) : formatCurrency(item.price)} {selectedSale.currency_symbol}
                              </span>
                            </div>
                            <div className="item-detail">
                              <span className="detail-label">ລວມ:</span>
                              <span className="detail-value">
                                {formatCurrency(item.qty * item.price)} {selectedSale.currency_symbol}
                              </span>
                            </div>
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                    {/* Add a summary section */}
                    <div className="mt-3 pt-2 border-top">
                      <div className="d-flex justify-content-between">
                        <strong>ຈຳນວນລາຍການທັງໝົດ:</strong>
                        <span>{selectedSale.items ? selectedSale.items.length : 0}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <strong>ຈຳນວນສິນຄ້າທັງໝົດ:</strong>
                        <span>
                          {selectedSale.items 
                            ? selectedSale.items.reduce((total, item) => total + parseFloat(item.qty.toString()), 0)
                            : 0}
                        </span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              )}
            </Col>
          </Row>
        )}
      </Container>
    </>
  );
};

export default SalesHistoryPage;