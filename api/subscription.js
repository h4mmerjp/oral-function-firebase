// サブスクリプション管理 API
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Firebase Admin SDK の初期化
const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
  });
}

const db = admin.firestore();

module.exports = async (req, res) => {
  // CORS ヘッダー設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { uid, action } = req.query;

    if (!uid) {
      return res.status(400).json({ error: 'UID is required' });
    }

    // アクション別処理
    switch (action) {
      case 'get':
        return await getSubscriptionStatus(req, res, uid);
      
      case 'cancel':
        return await cancelSubscription(req, res, uid);
        
      case 'reactivate':
        return await reactivateSubscription(req, res, uid);
        
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Subscription API エラー:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// サブスクリプション状況取得
async function getSubscriptionStatus(req, res, uid) {
  try {
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const subscription = userData.subscription || {};

    let stripeData = null;
    
    // Stripe側のデータも取得
    if (subscription.stripeSubscriptionId) {
      try {
        stripeData = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
      } catch (stripeError) {
        console.error('Stripe データ取得エラー:', stripeError);
      }
    }

    return res.status(200).json({
      subscription: {
        plan: subscription.plan || 'free',
        status: subscription.status || 'inactive',
        currentPeriodEnd: subscription.currentPeriodEnd,
        patientLimit: subscription.patientLimit || 5,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        stripeCustomerId: subscription.stripeCustomerId
      },
      usage: userData.usage || { patientCount: 0 },
      stripeData: stripeData ? {
        id: stripeData.id,
        status: stripeData.status,
        current_period_end: new Date(stripeData.current_period_end * 1000),
        cancel_at_period_end: stripeData.cancel_at_period_end,
        latest_invoice: stripeData.latest_invoice
      } : null
    });

  } catch (error) {
    console.error('サブスクリプション状況取得エラー:', error);
    throw error;
  }
}

// サブスクリプションキャンセル
async function cancelSubscription(req, res, uid) {
  try {
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const subscription = userData.subscription || {};

    if (!subscription.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Stripe側でキャンセル（期間末にキャンセル）
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: true
      }
    );

    // Firestore更新
    await userRef.update({
      'subscription.status': 'cancel_at_period_end',
      'subscription.lastUpdated': admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({
      message: 'Subscription will be canceled at the end of the current period',
      cancelAt: new Date(updatedSubscription.current_period_end * 1000)
    });

  } catch (error) {
    console.error('サブスクリプションキャンセルエラー:', error);
    throw error;
  }
}

// サブスクリプション再開
async function reactivateSubscription(req, res, uid) {
  try {
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const subscription = userData.subscription || {};

    if (!subscription.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    // Stripe側でキャンセルを取り消し
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: false
      }
    );

    // Firestore更新
    await userRef.update({
      'subscription.status': updatedSubscription.status,
      'subscription.lastUpdated': admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({
      message: 'Subscription reactivated successfully',
      status: updatedSubscription.status
    });

  } catch (error) {
    console.error('サブスクリプション再開エラー:', error);
    throw error;
  }
}