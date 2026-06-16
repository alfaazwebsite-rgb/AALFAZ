const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { items, success_url, cancel_url } = JSON.parse(event.body);

    // Format items for Stripe Checkout
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd', // Defaulting to USD for international
        product_data: {
          name: item.name,
          images: [item.image],
        },
        unit_amount: Math.round((item.priceNum / 83) * 100), // Very rough INR to USD conversion for demo
      },
      quantity: item.quantity,
    }));

    // Add shipping if applicable
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
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ id: session.id, url: session.url })
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to create Stripe session' })
    };
  }
};
