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
    // Updated navbar to use consistent colors with POS theme
    <Navbar expand="lg" style={{ 
      background: 'linear-gradient(120deg, #007bff, #0056b3)', 
      padding: '0.75rem 1.5rem',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
    }}>
      <Container fluid>
        <Navbar.Brand as={Link} to="/" className="fw-bold d-flex align-items-center text-white" style={{ padding: '0.25rem 0' }}>
          <img 
            src="/image/logo.png" 
            alt="Logo" 
            style={{ height: '40px', marginRight: '15px' }}
          />
        </Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse className="justify-content-end">
          <Nav className="align-items-center">
            <Nav.Link as={Link} to="/pos-flask" className="mx-2 px-3 py-2 rounded text-white fw-bold" style={{ 
              fontSize: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(5px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <i className="bi bi-display"></i> ລະບົບ POS
            </Nav.Link>
            <Nav.Link as={Link} to="/products" className="mx-2 px-3 py-2 rounded text-white fw-bold" style={{ 
              fontSize: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(5px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <i className="bi bi-list"></i> ລາຍການສິນຄ້າ
            </Nav.Link>
            
            <Nav.Link as={Link} to="/transfers" className="mx-2 px-3 py-2 rounded text-white fw-bold" style={{ 
              fontSize: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(5px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <i className="bi bi-cart-plus"></i> ຄຳຂໍເຕີມສິນຄ້າ
            </Nav.Link>
            {
              isLoggedIn ? (
                <Dropdown as={Nav.Item} align="end">
                  <Dropdown.Toggle as={Nav.Link} className="mx-2 px-3 py-2 rounded text-white fw-bold" style={{ 
                    fontSize: '1rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(5px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    <i className="bi bi-person-circle me-2"></i> {userName}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={handleLogout}>
                      <i className="bi bi-box-arrow-right me-2"></i> ອອກຈາກລະບົບ
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              ) : (
                <Nav.Link as={Link} to="/login" className="ms-3 text-white fw-bold" style={{ fontSize: '1rem' }}>
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