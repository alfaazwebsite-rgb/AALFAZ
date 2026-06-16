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

  // Guard: No fallback test keys — only run if properly configured
  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      statusCode: 503,
      headers: CORS,
      body: JSON.stringify({
        error: 'not_configured',
        message: 'Stripe is not yet configured. Please add your Stripe credentials in the admin panel.'
      })
    };
  }

  try {
    // Initialize Stripe inside handler so missing key doesn't crash cold start
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    const body = JSON.parse(event.body || '{}');
    const { items, success_url, cancel_url } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'No items in cart' }) };
    }

    // Build line items — filter out items with invalid prices
    const lineItems = items
      .filter(item => item.priceNum > 0 && item.quantity > 0)
      .map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            // Only pass image if it's an absolute URL (Stripe requires it)
            ...(item.image && item.image.startsWith('http') ? { images: [item.image] } : {})
          },
          unit_amount: Math.round((item.priceNum / 83) * 100), // INR to USD cents
        },
        quantity: item.quantity,
      }));

    if (lineItems.length === 0) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'No valid items' }) };
    }

    // Add shipping charge if under free shipping threshold
    const totalInr = items.reduce((sum, item) => sum + (item.priceNum * item.quantity), 0);
    if (totalInr < 50000) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'International Shipping' },
          unit_amount: Math.round((999 / 83) * 100),
        },
        quantity: 1
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: success_url || 'https://aalfaz-4244d.web.app/cart.html?payment=success',
      cancel_url: cancel_url || 'https://aalfaz-4244d.web.app/cart.html?payment=cancelled',
    });

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ id: session.id, url: session.url })
    };
  } catch (error) {
    console.error('Stripe create-session error:', error);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: error.message || 'Failed to create Stripe session' })
    };
  }
};
