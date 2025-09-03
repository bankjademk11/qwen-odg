import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import ProductList from './ProductList';
import RestockRequest from './RestockRequest';
import AnalysisPage from './AnalysisPage';
import TransferPage from './TransferPage';
import TransferDetailsPage from './TransferDetailsPage';
import TransferPrintPage from './TransferPrintPage'; // Import the new page
import LoginPage from './LoginPage';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './index.css';

// ProtectedRoute component to check authentication
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const user = localStorage.getItem('loggedInUser'); // Use loggedInUser from my logic
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} /> {/* Login Page is not protected */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ProductList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <ProductList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/restock"
          element={
            <ProtectedRoute>
              <RestockRequest />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analysis"
          element={
            <ProtectedRoute>
              <AnalysisPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transfers"
          element={
            <ProtectedRoute>
              <TransferPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transfers/:transferId"
          element={
            <ProtectedRoute>
              <TransferDetailsPage />
            </ProtectedRoute>
          }
        />
        {/* Add the new print route */}
        <Route
          path="/transfers/:transferId/print"
          element={
            <ProtectedRoute>
              <TransferPrintPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);