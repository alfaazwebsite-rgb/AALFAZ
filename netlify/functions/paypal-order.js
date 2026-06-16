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

  // Guard: No fake fallback — only run if credentials are configured
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    return {
      statusCode: 503,
      headers: CORS,
      body: JSON.stringify({
        error: 'not_configured',
        message: 'PayPal is not yet configured. Please add your PayPal credentials in the admin panel.'
      })
    };
  }

  try {
    const paypal = require('@paypal/checkout-server-sdk');

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    // Use PAYPAL_ENV env var to control live vs sandbox — NOT NODE_ENV
    // (Netlify always sets NODE_ENV=production, so it cannot be used for this)
    const isLive = process.env.PAYPAL_ENV === 'live';
    const environment = isLive
      ? new paypal.core.LiveEnvironment(clientId, clientSecret)
      : new paypal.core.SandboxEnvironment(clientId, clientSecret);
    const client = new paypal.core.PayPalHttpClient(environment);

    const body = JSON.parse(event.body || '{}');
    const amount = parseFloat(body.amount);

    if (!amount || amount <= 0 || isNaN(amount)) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid amount' }) };
    }

    // Convert INR to USD
    const amountUsd = (amount / 83).toFixed(2);

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: amountUsd.toString()
        }
      }]
    });

    const response = await client.execute(request);

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        id: response.result.id,
        links: response.result.links
      })
    };
  } catch (error) {
    console.error('PayPal order error:', error);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Failed to create PayPal order' })
    };
  }
};
