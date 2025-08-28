import { Container, Row, Col, Table, Button, Form, Navbar, Nav } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  // Mock data for products
  const products = [
    { id: 1, name: 'สินค้า A', price: 100, stock: 50, backStock: 30 },
    { id: 2, name: 'สินค้า B', price: 200, stock: 20, backStock: 10 },
    { id: 3, name: 'สินค้า C', price: 150, stock: 15, backStock: 25 },
  ];

  // Mock data for sales
  const sales = [
    { id: 1, productId: 1, quantity: 2, date: '2023-10-26' },
    { id: 2, productId: 2, quantity: 1, date: '2023-10-26' },
  ];

  // Mock data for restock requests
  const restockRequests = [
    { id: 1, productId: 1, quantity: 10, status: 'Pending' },
  ];

  return (
    <div className="App">
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand href="#home">ODIEN MALL</Navbar.Brand>
          <Nav className="me-auto">
            <Nav.Link href="#dashboard">Dashboard</Nav.Link>
            <Nav.Link href="#products">Products</Nav.Link>
            <Nav.Link href="#sales">Sales</Nav.Link>
            <Nav.Link href="#restock">Restock Requests</Nav.Link>
          </Nav>
        </Container>
      </Navbar>

      <Container className="mt-4">
        <Row>
          <Col>
            <h2>Dashboard</h2>
            <p>ยินดีต้อนรับสู่ระบบ POS</p>
          </Col>
        </Row>

        <Row className="mt-4">
          <Col md={8}>
            <h4>รายการสินค้า</h4>
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>ชื่อสินค้า</th>
                  <th>ราคา</th>
                  <th>จำนวนในร้าน</th>
                  <th>จำนวนในคลัง</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id}>
                    <td>{product.id}</td>
                    <td>{product.name}</td>
                    <td>{product.price}</td>
                    <td>{product.stock}</td>
                    <td>{product.backStock}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Col>
          
          <Col md={4}>
            <h4>รายงานการขาย</h4>
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>รหัสสินค้า</th>
                  <th>จำนวนที่ขาย</th>
                  <th>วันที่</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id}>
                    <td>{sale.productId}</td>
                    <td>{sale.quantity}</td>
                    <td>{sale.date}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            
            <h4 className="mt-4">คำขอเติมสินค้า</h4>
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>รหัสสินค้า</th>
                  <th>จำนวนที่ขอ</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {restockRequests.map(request => (
                  <tr key={request.id}>
                    <td>{request.productId}</td>
                    <td>{request.quantity}</td>
                    <td>{request.status}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            
            <Form className="mt-4">
              <Form.Group className="mb-3">
                <Form.Label>รหัสสินค้า</Form.Label>
                <Form.Control type="text" placeholder="ใส่รหัสสินค้า" />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>จำนวน</Form.Label>
                <Form.Control type="number" placeholder="ใส่จำนวนที่ต้องการ" />
              </Form.Group>
              
              <Button variant="primary" type="submit">
                ส่งคำขอเติมสินค้า
              </Button>
            </Form>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default App;