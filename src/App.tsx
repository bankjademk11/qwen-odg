import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import NavigationBar from './NavigationBar';
import LoginPage from './LoginPage';
import ProductList from './ProductList';
import RestockRequest from './RestockRequest';
import TransferPage from './TransferPage';
import EditTransferPage from './EditTransferPage';
import TransferDetailsPage from './TransferDetailsPage';
import TransferPrintPage from './TransferPrintPage';
import AnalysisPage from './AnalysisPage';
import POSPage from './POSPage';
import POSPageFlask from './POSPageFlask';

function App() {
  return (
    <Router>
      <div className="App">
        <NavigationBar />
        
        <Routes>
          <Route path="/" element={
            <Container className="mt-4">
              <h1>ຍິນດີຕ້ອນຮັບສູ່ລະບົບ POS</h1>
              <p>ກະລຸນາເລືອກເມນູດ້ານເທິງເພື່ອເບິ່ງລາຍການສິນຄ້າ ຫຼື ຈັດການຄຳຂໍເຕີມສິນຄ້າ</p>
              
              <Row className="mt-4">
                <Col md={6} className="mb-3">
                  <Card>
                    <Card.Body>
                      <Card.Title>ລະບົບ POS ຕົ້ນສະບັບ</Card.Title>
                      <Card.Text>
                        ໃຊ້ FastAPI ສຳລັບ backend
                      </Card.Text>
                      <Link to="/pos" className="btn btn-primary">ໄປທີ່ POS</Link>
                    </Card.Body>
                  </Card>
                </Col>
                
                <Col md={6} className="mb-3">
                  <Card>
                    <Card.Body>
                      <Card.Title>ລະບົບ POS ແບບໃໝ່ (Flask)</Card.Title>
                      <Card.Text>
                        ໃຊ້ Flask ສຳລັບ backend
                      </Card.Text>
                      <Link to="/pos-flask" className="btn btn-success">ໄປທີ່ POS (Flask)</Link>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Container>
          } />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/restock" element={<RestockRequest />} />
          <Route path="/transfers" element={<TransferPage />} />
          <Route path="/transfers/:id" element={<EditTransferPage />} />
          <Route path="/transfer-details/:id" element={<TransferDetailsPage />} />
          <Route path="/transfer-print/:id" element={<TransferPrintPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/pos" element={<POSPage />} />
          <Route path="/pos-flask" element={<POSPageFlask />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;