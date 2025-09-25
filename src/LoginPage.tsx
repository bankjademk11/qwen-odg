import React, { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css'; // Import the new styles

function LoginPage() {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_FASTAPI_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('loggedInUser', JSON.stringify(data.user));
        navigate('/'); // Redirect to home page on successful login
      } else {
        setError(data.message || 'ເຂົ້າສູ່ລະບົບບໍ່ສຳເລັດ');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('ເຄືອຂ່າຍຜິດພາດ ຫຼືເຊີບເວີບໍ່ສາມາດເຂົ້າເຖິງໄດ້.');
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-box">
        <img src="/image/logo.png" alt="Company Logo" className="login-logo" />
        <div className="login-form">
          <h2 className="text-center">ຍິນດີຕ້ອນຮັບ</h2>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group id="code" className="mb-3">
              <Form.Label>ລະຫັດຜູ້ໃຊ້</Form.Label>
              <Form.Control
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ປ້ອນລະຫັດຜູ້ໃຊ້ຂອງທ່ານ"
                required
              />
            </Form.Group>
            <Form.Group id="password" className="mb-3">
              <Form.Label>ລະຫັດຜ່ານ</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ປ້ອນລະຫັດຜ່ານຂອງທ່ານ"
                required
              />
            </Form.Group>
            <Button className="w-100" type="submit" variant="primary">
              ເຂົ້າສູ່ລະບົບ
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
