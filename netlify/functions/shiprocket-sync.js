const axios = require('axios');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // Guard: only run if credentials are configured
  if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
    return {
      statusCode: 503,
      headers: CORS,
      body: JSON.stringify({
        error: 'not_configured',
        message: 'Shiprocket is not yet configured. Please add credentials in the admin panel.'
      })
    };
  }

  try {
    const { orderDetails, customerDetails } = JSON.parse(event.body || '{}');

    if (!orderDetails || !customerDetails) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing order or customer details' }) };
    }

    // 1. Authenticate with Shiprocket
    const authRes = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD
    });
    const token = authRes.data.token;

    if (!token) throw new Error('Shiprocket auth failed — check email/password');

    // 2. Parse customer name (form only collects full name as one field)
    const nameParts = (customerDetails.name || 'Customer').trim().split(' ');
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || '.';

    // 3. Build Shiprocket order — use full address as billing_address
    //    City/State/Pincode extracted via simple regex from address string if possible
    const addressRaw = customerDetails.address || '';
    const pincodeMatch = addressRaw.match(/\b\d{6}\b/);
    const pincode = pincodeMatch ? pincodeMatch[0] : '110001'; // fallback Delhi pincode

    const shiprocketOrder = {
      order_id: orderDetails.id || `ALF-${Date.now()}`,
      order_date: new Date().toISOString().split('T')[0],
      pickup_location: 'Primary',
      billing_customer_name: firstName,
      billing_last_name: lastName,
      billing_address: addressRaw,
      billing_city: customerDetails.city || 'Delhi',
      billing_pincode: pincode,
      billing_state: customerDetails.state || 'Delhi',
      billing_country: 'India',
      billing_email: customerDetails.email || 'customer@aalfaz.com',
      billing_phone: (customerDetails.phone || '').replace(/\D/g, '').slice(-10), // clean to 10 digits
      shipping_is_billing: true,
      order_items: (orderDetails.items || []).map((item, i) => ({
        name: item.name,
        sku: item.sku || `ALF-SKU-${i + 1}`,
        units: item.quantity || 1,
        selling_price: item.priceNum || 0
      })),
      payment_method: orderDetails.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
      sub_total: orderDetails.subtotal || 0,
      length: 10,
      breadth: 10,
      height: 5,
      weight: 0.2 // default 200g for jewelry
    };

    // 4. Push order to Shiprocket
    const orderRes = await axios.post(
      'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc',
      shiprocketOrder,
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        status: 'success',
        shiprocket_order_id: orderRes.data.order_id,
        shipment_id: orderRes.data.shipment_id
      })
    };
  } catch (error) {
    console.error('Shiprocket error:', error.response ? error.response.data : error.message);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Failed to sync order with Shiprocket' })
    };
  }
};
