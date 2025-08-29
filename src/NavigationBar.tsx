import React from 'react';
import { Container, Navbar, Nav, Dropdown } from 'react-bootstrap'; // Added Dropdown
import 'bootstrap/dist/css/bootstrap.min.css';
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate

function NavigationBar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = user.name_1 || user.code || 'Guest'; // Display user's name or code

  const handleLogout = () => {
    localStorage.removeItem('user'); // Clear user data
    navigate('/login'); // Redirect to login page
  };

  const handleViewDetails = () => {
    // Placeholder for viewing user details
    console.log('View User Details for:', userName);
    alert('View User Details functionality not yet implemented.');
  };

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
            {/* User Dropdown */}
            <Dropdown as={Nav.Item} align="end">
              <Dropdown.Toggle as={Nav.Link} className="mx-2 px-3 py-2 rounded bg-light text-primary fw-bold">
                <i className="bi bi-person-circle"></i> {userName}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={handleViewDetails}>
                  <i className="bi bi-info-circle"></i> View Details
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right"></i> Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavigationBar;
