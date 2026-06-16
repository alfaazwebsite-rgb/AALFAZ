const crypto = require('crypto');
const axios = require('axios');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { amount, transactionId, userId } = JSON.parse(event.body);

    const merchantId = process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT'; // Default test
    const saltKey = process.env.PHONEPE_SALT_KEY || '099eb0cd-02cf-4e2a-8aca-3e6c6aff0399'; // Default test
    const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
    
    // Determine prod or test URL
    const isProd = process.env.NODE_ENV === 'production';
    const endpoint = isProd 
      ? 'https://api.phonepe.com/apis/hermes/pg/v1/pay' 
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay';

    const payload = {
      merchantId: merchantId,
      merchantTransactionId: transactionId || `T${Date.now()}`,
      merchantUserId: userId || 'MUID123',
      amount: amount * 100, // paise
      redirectUrl: 'https://aalfaz-4244d.web.app/cart.html?phonepe=success',
      redirectMode: 'REDIRECT',
      callbackUrl: 'https://aalfaz-4244d.web.app/.netlify/functions/phonepe-callback',
      paymentInstrument: {
        type: 'PAY_PAGE'
      }
    };

    // Base64 encode payload
    const base64EncodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
    
    // X-VERIFY = SHA256(Base64Payload + "/pg/v1/pay" + saltKey) + ### + saltIndex
    const string = base64EncodedPayload + '/pg/v1/pay' + saltKey;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    const checksum = sha256 + '###' + saltIndex;

    const response = await axios.post(endpoint, {
      request: base64EncodedPayload
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': merchantId
      }
    });

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to initiate PhonePe payment' })
    };
  }
};
