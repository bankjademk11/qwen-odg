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
    <Navbar variant="dark" expand="lg" style={{ backgroundColor: '#6fa8dc', padding: '0.75rem 1.5rem' }}>
      <Container fluid>
        <Navbar.Brand as={Link} to="/" className="fw-bold d-flex align-items-center" style={{ padding: '0.25rem 0' }}>
          <img 
            src="/image/logo.png" 
            alt="Logo" 
            style={{ height: '40px', marginRight: '15px' }}
          />
        </Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse className="justify-content-end">
          <Nav className="align-items-center">
            {/* <Nav.Link as={Link} to="/pos" className="mx-2 px-3 py-2 rounded bg-success text-white fw-bold" style={{ fontSize: '1rem' }}>
              <i className="bi bi-display"></i> ລະບົບ POS (FastAPI)
            </Nav.Link> */}
            <Nav.Link as={Link} to="/pos-flask" className="mx-2 px-3 py-2 rounded bg-warning text-dark fw-bold" style={{ fontSize: '1rem' }}>
              <i className="bi bi-display"></i> ລະບົບ POS
            </Nav.Link>
            <Nav.Link as={Link} to="/products" className="mx-2 px-3 py-2 rounded bg-light text-primary fw-bold" style={{ fontSize: '1rem' }}>
              <i className="bi bi-list"></i> ລາຍການສິນຄ້າ
            </Nav.Link>
            <Nav.Link as={Link} to="/transfers" className="mx-2 px-3 py-2 rounded bg-light text-primary fw-bold" style={{ fontSize: '1rem' }}>
              <i className="bi bi-cart-plus"></i> ຄຳຂໍເຕີມສິນຄ້າ
            </Nav.Link>
            {
              isLoggedIn ? (
                <Dropdown as={Nav.Item} align="end">
                  <Dropdown.Toggle as={Nav.Link} className="mx-2 px-3 py-2 rounded bg-light text-primary fw-bold" style={{ fontSize: '1rem' }}>
                    <i className="bi bi-person-circle me-2"></i> {userName}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={handleLogout}>
                      <i className="bi bi-box-arrow-right me-2"></i> ອອກຈາກລະບົບ
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              ) : (
                <Nav.Link as={Link} to="/login" className="ms-3 text-light" style={{ fontSize: '1rem' }}>
                  <i className="bi bi-person-circle me-2"></i> ເຂົ້າສູ່ລະບົບ
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