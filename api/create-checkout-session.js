// Vercel API Function: Stripe Checkout Session作成
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // OPTIONSリクエストの処理
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // POSTメソッドのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priceId, userId, userEmail, successUrl, cancelUrl } = req.body;

    // 必須パラメータのチェック
    if (!priceId || !userId || !userEmail) {
      return res.status(400).json({
        error: 'Missing required parameters: priceId, userId, userEmail'
      });
    }

    console.log('Checkout session作成開始:', { priceId, userId, userEmail });

    // Stripe Checkout Sessionを作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${req.headers.origin}/dashboard.html?subscription=success`,
      cancel_url: cancelUrl || `${req.headers.origin}/dashboard.html?subscription=cancelled`,
      customer_email: userEmail,
      metadata: {
        userId: userId,
      },
      subscription_data: {
        metadata: {
          userId: userId,
        },
      },
      // 税金設定（必要に応じて）
      automatic_tax: {
        enabled: false,
      },
      // 請求書設定
      invoice_creation: {
        enabled: true,
      },
    });

    console.log('Checkout session作成成功:', session.id);

    res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('Checkout session作成エラー:', error);

    // Stripeエラーの詳細を返す
    if (error.type === 'StripeCardError') {
      res.status(400).json({ error: error.message });
    } else if (error.type === 'StripeRateLimitError') {
      res.status(429).json({ error: 'Too many requests' });
    } else if (error.type === 'StripeInvalidRequestError') {
      res.status(400).json({ error: 'Invalid request parameters' });
    } else if (error.type === 'StripeAPIError') {
      res.status(500).json({ error: 'Stripe API error' });
    } else if (error.type === 'StripeConnectionError') {
      res.status(500).json({ error: 'Network error' });
    } else if (error.type === 'StripeAuthenticationError') {
      res.status(401).json({ error: 'Authentication error' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}