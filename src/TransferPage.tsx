import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Button, Form, Spinner, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import NavigationBar from './NavigationBar';

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TransferPage: React.FC = () => {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Default the date filter to today
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [transferNumber, setTransferNumber] = useState<string>('');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingTransfer, setEditingTransfer] = useState<any>(null);
  const [sourceWarehouses, setSourceWarehouses] = useState<any[]>([]);
  const [destinationWarehouses, setDestinationWarehouses] = useState<any[]>([]);
  const [sourceLocations, setSourceLocations] = useState<any[]>([]);
  const [destinationLocations, setDestinationLocations] = useState<any[]>([]);
  const [editForm, setEditForm] = useState({
    wh_from: '',
    location_from: '',
    wh_to: '',
    location_to: ''
  });
  const [saving, setSaving] = useState<boolean>(false);

  const navigate = useNavigate();

  // Fetch warehouses for edit modal
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        // Fetch source warehouses (now returns all warehouses like destination)
        const sourceResponse = await fetch('http://localhost:8004/api/warehouses');
        if (sourceResponse.ok) {
          const sourceData = await sourceResponse.json();
          setSourceWarehouses(sourceData);
        }

        // Fetch destination warehouses
        const destResponse = await fetch('http://localhost:8004/api/destination-warehouses');
        if (destResponse.ok) {
          const destData = await destResponse.json();
          setDestinationWarehouses(destData);
        }
      } catch (e: any) {
        console.error('Error fetching warehouses:', e);
        alert('Error fetching warehouse data: ' + e.message);
      }
    };

    fetchWarehouses();
  }, []);

  // Fetch locations when warehouse changes in edit form
  useEffect(() => {
    const fetchLocations = async () => {
      if (editForm.wh_from) {
        try {
          const response = await fetch(`http://localhost:8004/api/locations/${editForm.wh_from}`);
          if (response.ok) {
            const data = await response.json();
            setSourceLocations(data);
          } else {
            console.error('Failed to fetch source locations');
            setSourceLocations([]);
          }
        } catch (e: any) {
          console.error('Error fetching source locations:', e);
          setSourceLocations([]);
        }
      } else {
        setSourceLocations([]);
      }
    };

    fetchLocations();
  }, [editForm.wh_from]);

  useEffect(() => {
    const fetchLocations = async () => {
      if (editForm.wh_to) {
        try {
          const response = await fetch(`http://localhost:8004/api/destination-locations/${editForm.wh_to}`);
          if (response.ok) {
            const data = await response.json();
            setDestinationLocations(data);
          } else {
            console.error('Failed to fetch destination locations');
            setDestinationLocations([]);
          }
        } catch (e: any) {
          console.error('Error fetching destination locations:', e);
          setDestinationLocations([]);
        }
      } else {
        setDestinationLocations([]);
      }
    };

    fetchLocations();
  }, [editForm.wh_to]);

  // Fetch transfers whenever the selectedDate changes
  useEffect(() => {
    const fetchTransfers = async () => {
      if (!selectedDate) return; // Do not fetch if date is empty

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:8004/api/transfers?date=${selectedDate}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTransfers(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransfers();
  }, [selectedDate]);

  const handleCreateTransfer = () => {
    navigate('/restock');
  };

  const handleDelete = (transferId: string) => {
    // TODO: Implement API call for deletion
    alert(`(ยังไม่ได้ทำ) ลบรายการ: ${transferId}`);
  };

  const handleView = (transfer: any) => {
    console.log('Transfer data being passed to details page:', transfer);
    navigate(`/transfers/${transfer.id}`, { state: { transferDetails: transfer } });
  };

  // Open edit modal with transfer data
  const handleEdit = (transfer: any) => {
    setEditingTransfer(transfer);
    setEditForm({
      wh_from: transfer.wh_from || '',
      location_from: transfer.location_from || '',
      wh_to: transfer.wh_to || '',
      location_to: transfer.location_to || ''
    });
    // Pre-fetch locations for the current warehouses
    if (transfer.wh_from) {
      fetch(`http://localhost:8004/api/locations/${transfer.wh_from}`)
        .then(response => response.ok ? response.json() : [])
        .then(data => setSourceLocations(data))
        .catch(() => setSourceLocations([]));
    }
    if (transfer.wh_to) {
      fetch(`http://localhost:8004/api/destination-locations/${transfer.wh_to}`)
        .then(response => response.ok ? response.json() : [])
        .then(data => setDestinationLocations(data))
        .catch(() => setDestinationLocations([]));
    }
    setShowEditModal(true);
  };

  // Save edited transfer
  const handleSaveEdit = async () => {
    if (!editingTransfer) return;

    // Validation
    if (!editForm.wh_from || !editForm.location_from || !editForm.wh_to || !editForm.location_to) {
      alert('ກະລຸນາເລືອກຄັງ ແລະ ບ່ອນເກັບ ທັງສອງຂ້າງ');
      return;
    }

    setSaving(true);
    try {
      // Call API to update transfer
      const response = await fetch(`http://localhost:8004/api/transfers/${editingTransfer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      // Update the local state with the edited transfer
      const updatedTransfers = transfers.map(t => 
        t.id === editingTransfer.id ? { ...t, ...editForm } : t
      );
      setTransfers(updatedTransfers);
      
      // Close modal
      setShowEditModal(false);
      setEditingTransfer(null);
      
      // Show success message
      alert('ບັນທຶກຂໍ້ມູນສຳເລັດ');
    } catch (e: any) {
      console.error('Error saving transfer edit:', e);
      alert('เกิดຂ้อผิดพลาดในการบันທึกຂ้อมูล: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // TODO: Implement client-side filtering for transferNumber if needed, 
  // or create a new API endpoint for server-side search.
  const filteredTransfers = transfers.filter(t => {
    if (!transferNumber) return true;
    
    // Extract the numeric part from transfer number (e.g., "0001" from "FR25010001")
    const transferNo = t.transfer_no || '';
    const numericPart = transferNo.replace(/\D/g, ''); // Remove all non-digit characters
    
    // Also check the full transfer number for partial matches
    return transferNo.toLowerCase().includes(transferNumber.toLowerCase()) || 
           numericPart.includes(transferNumber);
  });

  return (
    <div>
      <NavigationBar />
      <Container className="mt-4">
        <Row className="mb-3">
          <Col md={4}>
            <Form.Group controlId="filterTransferNumber">
              <Form.Label>ເລກທີ່ຂໍໂອນ:</Form.Label>
              <Form.Control
                type="text"
                placeholder="ປ້ອນເລກທີ່ (e.g. 0001 ຫຼື FR25010001)"
                value={transferNumber}
                onChange={(e) => setTransferNumber(e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group controlId="filterDate">
              <Form.Label>ວັນທີເດືອນປີ:</Form.Label>
              <Form.Control
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={4} className="d-flex align-items-end justify-content-end">
            <Button variant="success" onClick={handleCreateTransfer}>
              ສ້າງລາຍການຂໍໂອນ
            </Button>
          </Col>
        </Row>

        <h2>ລາຍການຂໍ</h2>
        {loading ? (
          <div className="text-center">
            <Spinner animation="border" />
            <p>ກຳລັງໂຫຼດຂໍ້ມູນຂອງວັນທີ {selectedDate}...</p>
          </div>
        ) : error ? (
          <p style={{ color: 'red' }}>เกิดຂ้อผิดพลาด: {error}</p>
        ) : (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>ວັນທີເວລາຂໍ</th>
                <th>ເລກທີ່ຂໍ</th>
                <th>ຈຳນວນຂໍ</th>
                <th>ຜູ້ສ້າງ</th>
                <th>ສະຖານະ</th>
                <th>ຈັດການ</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center">ບໍ່ມີລາຍການຂໍໃນວັນທີ່ເລືອກ</td>
                </tr>
              ) : (
                filteredTransfers.map((transfer) => (
                  <tr key={transfer.id}>
                    <td>{transfer.doc_date_time}</td>
                    <td>{transfer.transfer_no}</td>
                    <td>{Math.round(transfer.quantity || 0)}</td>
                    <td>{transfer.creator}</td>
                    <td>
                      <span 
                        className={`badge ${
                          transfer.status_name === 'ໂອນສຳເລັດ' 
                            ? 'bg-success' 
                            : transfer.status_name === 'ລໍຖ້າໂອນ' 
                            ? 'bg-warning text-dark' 
                            : 'bg-secondary'
                        }`}
                      >
                        {transfer.status_name || 'ບໍ່ມີຂໍ້ມູນ'}
                      </span>
                    </td>
                    <td>
                      <Button variant="info" size="sm" className="me-2" onClick={() => handleView(transfer)}>
                        ເບິ່ງ
                      </Button>
                      <Button variant="warning" size="sm" className="me-2" onClick={() => handleEdit(transfer)}>
                        ແກ້ໄຂ
                      </Button>
                      <Button variant="primary" size="sm" className="me-2" onClick={() => navigate(`/transfers/${transfer.id}/print`)}>
                        <i className="bi bi-printer"></i>
                      </Button>
                      {/* <Button variant="danger" size="sm" onClick={() => handleDelete(transfer.id)}>
                        ລຶບ
                      </Button> */}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}
      </Container>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>ແກ້ໄຂຂໍໂອນ: {editingTransfer?.transfer_no}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingTransfer && (
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>ຄັງຕົ້ນທາງ:</Form.Label>
                    <Form.Select
                      value={editForm.wh_from}
                      onChange={(e) => setEditForm({...editForm, wh_from: e.target.value, location_from: ''})}
                    >
                      <option value="">ເລືອກຄັງ...</option>
                      {sourceWarehouses.map(wh => (
                        <option key={wh.code} value={wh.code}>{wh.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>ບ່ອນເກັບຕົ້ນທາງ:</Form.Label>
                    <Form.Select
                      value={editForm.location_from}
                      onChange={(e) => setEditForm({...editForm, location_from: e.target.value})}
                      disabled={!editForm.wh_from}
                    >
                      <option value="">ເລືອກບ່ອນເກັບ...</option>
                      {sourceLocations.map(loc => (
                        <option key={loc.code} value={loc.code}>{loc.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>ຄັງປາຍທາງ:</Form.Label>
                    <Form.Select
                      value={editForm.wh_to}
                      onChange={(e) => setEditForm({...editForm, wh_to: e.target.value, location_to: ''})}
                    >
                      <option value="">ເລືອກຄັງ...</option>
                      {destinationWarehouses.map(wh => (
                        <option key={wh.code} value={wh.code}>{wh.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>ບ່ອນເກັບປາຍທາງ:</Form.Label>
                    <Form.Select
                      value={editForm.location_to}
                      onChange={(e) => setEditForm({...editForm, location_to: e.target.value})}
                      disabled={!editForm.wh_to}
                    >
                      <option value="">ເລືອກບ່ອນເກັບ...</option>
                      {destinationLocations.map(loc => (
                        <option key={loc.code} value={loc.code}>{loc.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={saving}>
            ຍົກເລີກ
          </Button>
          <Button variant="primary" onClick={handleSaveEdit} disabled={saving}>
            {saving ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກ'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TransferPage;