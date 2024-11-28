import React, { useState } from 'react';
import axios from 'axios';

const App = () => {
  const [itemData, setItemData] = useState(null);
  const [formData, setFormData] = useState({ name: '', price: '' });
  const [paymentData, setPaymentData] = useState(null); // Holds payment details

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Submit item creation request
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:3001/create-item', formData);
      setItemData(response.data);
    } catch (error) {
      console.error('Error creating item:', error);
    }
  };

  // Handle purchase initialization
  const handlePurchase = async () => {
    if (!itemData) {
      alert('Create the item first!');
      return;
    }
    const purchaseData = {
      itemId: itemData.item._id,
      totalPrice: formData.price,
    };
    console.log(purchaseData);

    try {
      const response = await axios.post('http://localhost:3001/initialize-esewa', purchaseData);
      console.log(response.data);
      if (response.data.success) {
        setPaymentData(response.data.payment); // Store payment data (signature, etc.)
      } else {
        alert('Payment initialization failed.');
      }
    } catch (error) {
      console.error('Error initializing purchase:', error);
    }
  };

  // Submit data to eSewa
  const handleEsewa = () => {
    if (!paymentData) {
      alert('Please initialize the purchase first!');
      return;
    }

    // Construct eSewa form data using API response
    const esewaData = {
      amount: formData.price,
      tax_amount: '0',
      total_amount: formData.price,
      transaction_uuid: itemData.item._id, // Use item ID as transaction UUID
      product_code: 'EPAYTEST',
      product_service_charge: '0',
      product_delivery_charge: '0',
      success_url: 'http://localhost:3001/payment/complete-payment',
      failure_url: 'http://localhost:5173',
      signed_field_names: paymentData.signed_field_names,
      signature: paymentData.signature, // Use signature from API
    };

    // Create and submit form programmatically
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
    form.target = '_blank';

    for (const key in esewaData) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = esewaData[key];
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  return (
    <div>
    <center>
      <h2>Create Item</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Name:
          <input type="text" name="name" value={formData.name} onChange={handleChange} required />
        </label>
        <br />
        <label>
          Price:
          <input type="number" name="price" value={formData.price} onChange={handleChange} required />
        </label>
        <br />
        <button type="submit">Submit</button>
      </form>

      {itemData && (
        <div style={{ marginTop: '20px' }}>
          <strong>Item Created:</strong> {JSON.stringify(itemData.item.name)}
          <div style={{ marginTop: '20px' }}>
            <button onClick={handlePurchase}>Purchase</button>
            {paymentData && <button onClick={handleEsewa}>Continue with eSewa</button>}
          </div>
        </div>
      )}
      </center>
    </div>
  );
};

export default App;
