import React from 'react';
import { Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import NavigationBar from './NavigationBar';

function App() {
  return (
    <div className="App">
      <NavigationBar />
      
      <Container className="mt-4">
        <h1>ຍິນດີຕ້ອນຮັບສູ່ລະບົບ POS</h1>
        <p>ກະລຸນາເລືອກເມນູດ້ານເທິງເພື່ອເບິ່ງລາຍການສິນຄ້າ ຫຼື ຈັດການຄຳຂໍເຕີມສິນຄ້າ</p>
      </Container>
    </div>
  );
}

export default App;