// Vercel API Function: Stripe Subscription キャンセル
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

// Firebase Admin初期化（既に初期化されている場合はスキップ）
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

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
    const { userId } = req.body;

    // 必須パラメータのチェック
    if (!userId) {
      return res.status(400).json({
        error: 'Missing required parameter: userId'
      });
    }

    console.log('サブスクリプションキャンセル開始:', userId);

    // Firestoreからユーザーのサブスクリプション情報を取得
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const subscription = userData.subscription || {};

    if (!subscription.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Stripeでサブスクリプションをキャンセル
    const canceledSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: true, // 期間終了時にキャンセル
      }
    );

    console.log('Stripeサブスクリプションキャンセル成功:', canceledSubscription.id);

    // Firestoreを更新
    await userRef.update({
      'subscription.status': 'cancelled',
      'subscription.cancelAtPeriodEnd': true,
      'subscription.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('Firestoreサブスクリプション情報更新完了');

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription: {
        id: canceledSubscription.id,
        status: canceledSubscription.status,
        cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
        currentPeriodEnd: canceledSubscription.current_period_end,
      },
    });

  } catch (error) {
    console.error('サブスクリプションキャンセルエラー:', error);

    // Stripeエラーの詳細を返す
    if (error.type === 'StripeInvalidRequestError') {
      res.status(400).json({ error: 'Invalid subscription ID' });
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