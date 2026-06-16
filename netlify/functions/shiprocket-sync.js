const axios = require('axios');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { orderDetails, customerDetails } = JSON.parse(event.body);
    
    // 1. Authenticate with Shiprocket to get Token
    const authRes = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD
    });
    const token = authRes.data.token;

    // 2. Format Order for Shiprocket
    const shiprocketOrder = {
      order_id: orderDetails.id || `ORD-${Date.now()}`,
      order_date: new Date().toISOString().split('T')[0],
      pickup_location: "Primary",
      billing_customer_name: customerDetails.firstName,
      billing_last_name: customerDetails.lastName,
      billing_address: customerDetails.address,
      billing_city: customerDetails.city,
      billing_pincode: customerDetails.pincode,
      billing_state: customerDetails.state,
      billing_country: customerDetails.country || "India",
      billing_email: customerDetails.email,
      billing_phone: customerDetails.phone,
      shipping_is_billing: true,
      order_items: orderDetails.items.map(item => ({
        name: item.name,
        sku: item.sku || `SKU-${Date.now()}`,
        units: item.quantity,
        selling_price: item.priceNum
      })),
      payment_method: orderDetails.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
      sub_total: orderDetails.subtotal,
      length: 10,
      breadth: 10,
      height: 5,
      weight: 0.2 // Default 200g
    };

    // 3. Push to Shiprocket
    const orderRes = await axios.post('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', shiprocketOrder, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        status: "success",
        shiprocket_order_id: orderRes.data.order_id,
        shipment_id: orderRes.data.shipment_id
      })
    };
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to sync with Shiprocket' })
    };
  }
};
