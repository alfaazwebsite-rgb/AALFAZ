const Razorpay = require('razorpay');

// CORS headers for all responses
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // Guard: check credentials are configured
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return {
      statusCode: 503,
      headers: CORS,
      body: JSON.stringify({ error: 'not_configured', message: 'Razorpay is not yet set up. Please add credentials in the admin panel.' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const amount = parseFloat(body.amount);

    // Validate amount
    if (!amount || amount <= 0 || isNaN(amount)) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid amount' }) };
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise, must be integer
      currency: 'INR',
      receipt: `ALF-${Date.now()}`
    });

    // Return order + public key so frontend can init Razorpay widget
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ ...order, key_id: process.env.RAZORPAY_KEY_ID })
    };
  } catch (error) {
    console.error('Razorpay create-order error:', error);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Failed to create Razorpay order' })
    };
  }
};
