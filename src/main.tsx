import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import ProductList from './ProductList';
import RestockRequest from './RestockRequest';
import AnalysisPage from './AnalysisPage';
import TransferPage from './TransferPage';
import TransferDetailsPage from './TransferDetailsPage';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProductList />} />
        <Route path="/products" element={<ProductList />} />
        <Route path="/restock" element={<RestockRequest />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/transfers" element={<TransferPage />} />
        <Route path="/transfers/:transferId" element={<TransferDetailsPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
