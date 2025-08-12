// Stripe Checkout Session 作成 API
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // CORS ヘッダー設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priceId, uid, email } = req.body;

    // バリデーション
    if (!priceId || !uid || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields: priceId, uid, email' 
      });
    }

    // Stripe Customer の取得または作成
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      console.log('既存顧客を使用:', customer.id);
    } else {
      customer = await stripe.customers.create({
        email: email,
        metadata: {
          uid: uid
        }
      });
      console.log('新規顧客を作成:', customer.id);
    }

    // Checkout Session の作成
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin || process.env.DOMAIN}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || process.env.DOMAIN}?checkout=cancel`,
      subscription_data: {
        metadata: {
          uid: uid,
          email: email
        }
      },
      metadata: {
        uid: uid,
        email: email
      }
    });

    console.log('Checkout Session 作成成功:', session.id);

    return res.status(200).json({
      url: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error('Checkout API エラー:', error);
    
    let errorMessage = 'Internal server error';
    let statusCode = 500;

    if (error.type === 'StripeCardError') {
      errorMessage = 'カード情報に問題があります';
      statusCode = 400;
    } else if (error.type === 'StripeRateLimitError') {
      errorMessage = 'リクエストが多すぎます。しばらく待ってから再試行してください';
      statusCode = 429;
    } else if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'リクエストが無効です';
      statusCode = 400;
    } else if (error.type === 'StripeAPIError') {
      errorMessage = 'Stripe APIエラーが発生しました';
      statusCode = 502;
    }

    return res.status(statusCode).json({
      error: errorMessage,
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};