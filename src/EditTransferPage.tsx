import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Button, Card, Form, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import NavigationBar from './NavigationBar';

const EditTransferPage: React.FC = () => {
  const [transfer, setTransfer] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceWarehouses, setSourceWarehouses] = useState<any[]>([]);
  const [destinationWarehouses, setDestinationWarehouses] = useState<any[]>([]);
  const [sourceLocations, setSourceLocations] = useState<any[]>([]);
  const [destinationLocations, setDestinationLocations] = useState<any[]>([]);

  const navigate = useNavigate();
  const { transferId } = useParams<{ transferId: string }>();

  // Form state
  const [formData, setFormData] = useState({
    wh_from: '',
    location_from: '',
    wh_to: '',
    location_to: '',
    details: [] as any[]
  });

  // Fetch transfer details
  useEffect(() => {
    const fetchTransferDetails = async () => {
      if (!transferId) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${import.meta.env.VITE_FASTAPI_URL}/api/transfers/${transferId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTransfer(data);
        
        // Initialize form data
        setFormData({
          wh_from: data.wh_from || '',
          location_from: data.location_from || '',
          wh_to: data.wh_to || '',
          location_to: data.location_to || '',
          details: data.details || []
        });
      } catch (e: any) {
        console.error('Error fetching transfer details:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransferDetails();
  }, [transferId]);

  // Fetch warehouses
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        // Fetch source warehouses
        const sourceResponse = await fetch(`${import.meta.env.VITE_FASTAPI_URL}/api/warehouses`);
        if (sourceResponse.ok) {
          const sourceData = await sourceResponse.json();
          setSourceWarehouses(sourceData);
        }

        // Fetch destination warehouses
        const destResponse = await fetch(`${import.meta.env.VITE_FASTAPI_URL}/api/destination-warehouses`);
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

  // Fetch locations when warehouse changes
  useEffect(() => {
    const fetchLocations = async () => {
      if (formData.wh_from) {
        try {
          const response = await fetch(`${import.meta.env.VITE_FASTAPI_URL}/api/locations/${formData.wh_from}`);
          if (response.ok) {
            const data = await response.json();
            setSourceLocations(data);
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
  }, [formData.wh_from]);

  useEffect(() => {
    const fetchLocations = async () => {
      if (formData.wh_to) {
        try {
          const response = await fetch(`${import.meta.env.VITE_FASTAPI_URL}/api/destination-locations/${formData.wh_to}`);
          if (response.ok) {
            const data = await response.json();
            setDestinationLocations(data);
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
  }, [formData.wh_to]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle quantity change for items
  const handleQuantityChange = (index: number, value: string) => {
    const newDetails = [...formData.details];
    newDetails[index] = {
      ...newDetails[index],
      qty: value
    };
    setFormData(prev => ({
      ...prev,
      details: newDetails
    }));
  };

  // Add new item row
  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      details: [
        ...prev.details,
        {
          item_code: '',
          item_name: '',
          unit_code: '',
          qty: '1'
        }
      ]
    }));
  };

  // Remove item row
  const handleRemoveItem = (index: number) => {
    const newDetails = [...formData.details];
    newDetails.splice(index, 1);
    setFormData(prev => ({
      ...prev,
      details: newDetails
    }));
  };

  // Save changes
  const handleSave = async () => {
    // Validation
    if (!formData.wh_from || !formData.location_from || !formData.wh_to || !formData.location_to) {
      alert('ກະລຸນາເລືອກຄັງ ແລະ ບ່ອນເກັບ ທັງສອງຂ້າງ');
      return;
    }

    // Validate item quantities
    for (const item of formData.details) {
      if (!item.item_code || !item.item_name || !item.unit_code || !item.qty || parseFloat(item.qty) <= 0) {
        alert('ກະລຸນາກຳນົດຂໍ້ມູນສິນຄ້າໃຫ້ຄົບຖ້ວນ ແລະ ຈຳນວນຕ້ອງຫຼາຍກວ່າ 0');
        return;
      }
    }

    setSaving(true);
    try {
      // Call API to update transfer
      const response = await fetch(`${import.meta.env.VITE_FASTAPI_URL}/api/transfers/${transferId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      // Show success message and navigate back
      alert('ບັນທຶກຂໍ້ມູນສຳເລັດ');
      navigate('/transfers');
    } catch (e: any) {
      console.error('Error saving transfer edit:', e);
      alert('เกิดຂ้อผิดพลาดในการบันທึกຂ้อมูล: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <NavigationBar />
        <Container className="mt-4 text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p>ກຳລັງໂຫຼດຂໍ້ມູນ...</p>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <NavigationBar />
        <Container className="mt-4">
          <h2>ເກີດຂໍ້ຜິດພາດ</h2>
          <p>{error}</p>
          <Button variant="primary" onClick={() => navigate('/transfers')}>ກັບໄປ</Button>
        </Container>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div>
        <NavigationBar />
        <Container className="mt-4">
          <h2>ບໍ່ພົບຂໍ້ມູນການໂອນ</h2>
          <p>ບໍ່ສາມາດໂຫລດລາຍລະອຽດໄດ້. ກະລຸນາກັບໄປທີ່ລາຍການຂໍ.</p>
          <Button variant="primary" onClick={() => navigate('/transfers')}>ກັບໄປ</Button>
        </Container>
      </div>
    );
  }

  return (
    <div>
      <NavigationBar />
      <Container className="mt-4">
        <h2>ແກ້ໄຂລາຍການຂໍໂອນ: {transfer.transfer_no || transfer.doc_no || transfer.id || 'ບໍ່ມີຂໍ້ມູນ'}</h2>
        <Card className="mb-4">
          <Card.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>ຄັງຕົ້ນທາງ:</Form.Label>
                  <Form.Select
                    name="wh_from"
                    value={formData.wh_from}
                    onChange={handleInputChange}
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
                    name="location_from"
                    value={formData.location_from}
                    onChange={handleInputChange}
                    disabled={!formData.wh_from}
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
                    name="wh_to"
                    value={formData.wh_to}
                    onChange={handleInputChange}
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
                    name="location_to"
                    value={formData.location_to}
                    onChange={handleInputChange}
                    disabled={!formData.wh_to}
                  >
                    <option value="">ເລືອກບ່ອນເກັບ...</option>
                    {destinationLocations.map(loc => (
                      <option key={loc.code} value={loc.code}>{loc.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3>ລາຍການສິນຄ້າ</h3>
          <Button variant="success" onClick={handleAddItem}>
            + ເພີ່ມສິນຄ້າ
          </Button>
        </div>
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>ລະຫັດສິນຄ້າ</th>
              <th>ຊື່ສິນຄ້າ</th>
              <th>ຫົວໜ່ວຍ</th>
              <th>ຈຳນວນ</th>
              <th>ຈັດການ</th>
            </tr>
          </thead>
          <tbody>
            {formData.details.map((item: any, index: number) => (
              <tr key={index}>
                <td>
                  <Form.Control
                    type="text"
                    value={item.item_code}
                    onChange={(e) => {
                      const newDetails = [...formData.details];
                      newDetails[index] = {
                        ...newDetails[index],
                        item_code: e.target.value
                      };
                      setFormData(prev => ({
                        ...prev,
                        details: newDetails
                      }));
                    }}
                  />
                </td>
                <td>
                  <Form.Control
                    type="text"
                    value={item.item_name}
                    onChange={(e) => {
                      const newDetails = [...formData.details];
                      newDetails[index] = {
                        ...newDetails[index],
                        item_name: e.target.value
                      };
                      setFormData(prev => ({
                        ...prev,
                        details: newDetails
                      }));
                    }}
                  />
                </td>
                <td>
                  <Form.Control
                    type="text"
                    value={item.unit_code}
                    onChange={(e) => {
                      const newDetails = [...formData.details];
                      newDetails[index] = {
                        ...newDetails[index],
                        unit_code: e.target.value
                      };
                      setFormData(prev => ({
                        ...prev,
                        details: newDetails
                      }));
                    }}
                  />
                </td>
                <td>
                  <Form.Control
                    type="number"
                    value={item.qty}
                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                    min="1"
                  />
                </td>
                <td>
                  <Button variant="danger" size="sm" onClick={() => handleRemoveItem(index)}>
                    ລຶບ
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

        <div className="d-flex justify-content-between mt-4">
          <Button variant="secondary" onClick={() => navigate('/transfers')}>
            &larr; ກັບໄປລາຍການຂໍໂອນ
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກການແກ້ໄຂ'}
          </Button>
        </div>
      </Container>
    </div>
  );
};

export default EditTransferPage;