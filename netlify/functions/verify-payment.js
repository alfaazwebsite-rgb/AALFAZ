const crypto = require('crypto');

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

  if (!process.env.RAZORPAY_KEY_SECRET) {
    return {
      statusCode: 503,
      headers: CORS,
      body: JSON.stringify({ error: 'not_configured', message: 'Razorpay is not configured.' })
    };
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = JSON.parse(event.body || '{}');

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing payment fields' }) };
    }

    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    if (generated_signature === razorpay_signature) {
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ status: 'success', message: 'Payment verified successfully' })
      };
    } else {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ status: 'failure', message: 'Invalid payment signature' })
      };
    }
  } catch (error) {
    console.error('verify-payment error:', error);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Failed to verify payment' })
    };
  }
};
