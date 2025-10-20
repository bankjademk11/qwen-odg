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
import EditTransferPage from './EditTransferPage'; // Import the new edit page
import LoginPage from './LoginPage';
import POSPage from './POSPage'; // <--- Import POS Page
import POSPageFlask from './POSPageFlask'; // <--- Import Flask POS Page
import MiniMarketBillPage from './MiniMarketBillPage'; // <--- Import MiniMarketBillPage
import SalesHistoryPage from './SalesHistoryPage'; // <--- Import SalesHistoryPage
import CheckPricePage from './CheckPricePage'; // <--- Import CheckPricePage
import ImageManagementPage from './ImageManagementPage';
import NavigationBar from './NavigationBar'; // Import NavigationBar
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
      <NavigationBar />
      <Routes>
        <Route path="/login" element={<LoginPage />} /> {/* Login Page is not protected */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <POSPageFlask />
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
        <Route
          path="/transfers/:transferId/edit"
          element={
            <ProtectedRoute>
              <EditTransferPage />
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
        {/* Add the new POS route */}
        <Route
          path="/pos"
          element={
            <ProtectedRoute>
              <POSPage />
            </ProtectedRoute>
          }
        />
        {/* Add the new Flask POS route */}
        <Route
          path="/pos-flask"
          element={
            <ProtectedRoute>
              <POSPageFlask />
            </ProtectedRoute>
          }
        />
        <Route path="/receipt-print" element={<MiniMarketBillPage />} />
        <Route
          path="/sales-history"
          element={
            <ProtectedRoute>
              <SalesHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/check-price"
          element={
            <ProtectedRoute>
              <CheckPricePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/image-management"
          element={
            <ProtectedRoute>
              <ImageManagementPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);