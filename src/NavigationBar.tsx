import React from 'react';
import { Container, Navbar, Nav } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Link } from 'react-router-dom';

function NavigationBar() {
  return (
    <Navbar bg="primary" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-bold">ODIEN MALL</Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse className="justify-content-end">
          <Nav>
            <Nav.Link as={Link} to="/products" className="mx-2 px-3 py-2 rounded bg-light text-primary fw-bold">
              <i className="bi bi-list"></i> ລາຍການສິນຄ້າ
            </Nav.Link>
            <Nav.Link as={Link} to="/transfers" className="mx-2 px-3 py-2 rounded bg-light text-primary fw-bold">
              <i className="bi bi-cart-plus"></i> ຄຳຂໍເຕີມສິນຄ້າ
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavigationBar;