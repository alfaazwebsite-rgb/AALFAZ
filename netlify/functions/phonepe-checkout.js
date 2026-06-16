const crypto = require('crypto');
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

  // Guard: No fake fallback test keys — only run if properly configured
  if (!process.env.PHONEPE_MERCHANT_ID || !process.env.PHONEPE_SALT_KEY) {
    return {
      statusCode: 503,
      headers: CORS,
      body: JSON.stringify({
        error: 'not_configured',
        message: 'PhonePe is not yet configured. Please add your PhonePe credentials in the admin panel.'
      })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const amount = parseFloat(body.amount);
    const transactionId = body.transactionId || `ALF-${Date.now()}`;

    if (!amount || amount <= 0 || isNaN(amount)) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid amount' }) };
    }

    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';

    // Use PHONEPE_ENV env var — NOT NODE_ENV
    // (Netlify always sets NODE_ENV=production so it cannot be used for this)
    const isProd = process.env.PHONEPE_ENV === 'production';
    const endpoint = isProd
      ? 'https://api.phonepe.com/apis/hermes/pg/v1/pay'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay';

    const payload = {
      merchantId,
      merchantTransactionId: transactionId,
      merchantUserId: `USR-${Date.now()}`,
      amount: Math.round(amount * 100), // paise, must be integer
      redirectUrl: `${process.env.SITE_URL || 'https://aalfaz-4244d.web.app'}/cart.html?phonepe=success`,
      redirectMode: 'REDIRECT',
      paymentInstrument: { type: 'PAY_PAGE' }
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const hashString = base64Payload + '/pg/v1/pay' + saltKey;
    const sha256 = crypto.createHash('sha256').update(hashString).digest('hex');
    const checksum = sha256 + '###' + saltIndex;

    const response = await axios.post(endpoint, { request: base64Payload }, {
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': merchantId
      }
    });

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    console.error('PhonePe error:', error.response ? error.response.data : error.message);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Failed to initiate PhonePe payment' })
    };
  }
};
