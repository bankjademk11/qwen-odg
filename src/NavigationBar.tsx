import React, { useState, useEffect } from 'react';
import { Container, Navbar, Nav, Button, Dropdown } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Link, useNavigate } from 'react-router-dom';

function NavigationBar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem('loggedInUser');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setIsLoggedIn(true);
        setUserName(userData.name_1);
      } catch (e) {
        console.error("Failed to parse user data from localStorage", e);
        setIsLoggedIn(false);
        setUserName('');
      }
    } else {
      setIsLoggedIn(false);
      setUserName('');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    setIsLoggedIn(false);
    setUserName('');
    navigate('/login');
  };

  return (
    <Navbar bg="primary" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-bold">ODIEN MALL</Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse className="justify-content-end">
          <Nav className="align-items-center">
            <Nav.Link as={Link} to="/products" className="mx-2 px-3 py-2 rounded bg-light text-primary fw-bold">
              <i className="bi bi-list"></i> ລາຍການສິນຄ້າ
            </Nav.Link>
            <Nav.Link as={Link} to="/transfers" className="mx-2 px-3 py-2 rounded bg-light text-primary fw-bold">
              <i className="bi bi-cart-plus"></i> ຄຳຂໍເຕີມສິນຄ້າ
            </Nav.Link>
            {
              isLoggedIn ? (
                <Dropdown as={Nav.Item} align="end">
                  <Dropdown.Toggle as={Nav.Link} className="mx-2 px-3 py-2 rounded bg-light text-primary fw-bold">
                    <i className="bi bi-person-circle me-2"></i> {userName}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={handleLogout}>
                      <i className="bi bi-box-arrow-right me-2"></i> Logout
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              ) : (
                <Nav.Link as={Link} to="/login" className="ms-3 text-light">
                  <i className="bi bi-person-circle me-2"></i> Login
                </Nav.Link>
              )
            }
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavigationBar;