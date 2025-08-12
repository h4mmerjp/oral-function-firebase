// Stripe Webhook ハンドラー
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Webhook署名検証
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('Webhook署名検証成功:', event.type);
  } catch (err) {
    console.error('Webhook署名検証失敗:', err.message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  try {
    // イベントタイプ別処理
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log('未処理のイベントタイプ:', event.type);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook処理エラー:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// Checkout完了処理
async function handleCheckoutCompleted(session) {
  console.log('Checkout完了:', session.id);
  
  const uid = session.metadata?.uid;
  if (!uid) {
    console.error('UIDがメタデータに見つかりません');
    return;
  }

  try {
    // サブスクリプション情報を取得
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    
    await updateUserSubscription(uid, {
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      status: subscription.status,
      plan: getPlanFromPriceId(subscription.items.data[0].price.id),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      patientLimit: getPatientLimitFromPlan(getPlanFromPriceId(subscription.items.data[0].price.id))
    });

    console.log('Checkout完了処理成功:', uid);
  } catch (error) {
    console.error('Checkout完了処理エラー:', error);
  }
}

// サブスクリプション作成処理
async function handleSubscriptionCreated(subscription) {
  console.log('サブスクリプション作成:', subscription.id);
  
  const uid = subscription.metadata?.uid;
  if (!uid) {
    console.error('UIDがメタデータに見つかりません');
    return;
  }

  try {
    await updateUserSubscription(uid, {
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      plan: getPlanFromPriceId(subscription.items.data[0].price.id),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      patientLimit: getPatientLimitFromPlan(getPlanFromPriceId(subscription.items.data[0].price.id))
    });

    console.log('サブスクリプション作成処理成功:', uid);
  } catch (error) {
    console.error('サブスクリプション作成処理エラー:', error);
  }
}

// サブスクリプション更新処理
async function handleSubscriptionUpdated(subscription) {
  console.log('サブスクリプション更新:', subscription.id);
  
  const uid = subscription.metadata?.uid;
  if (!uid) {
    console.error('UIDがメタデータに見つかりません');
    return;
  }

  try {
    await updateUserSubscription(uid, {
      status: subscription.status,
      plan: getPlanFromPriceId(subscription.items.data[0].price.id),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      patientLimit: getPatientLimitFromPlan(getPlanFromPriceId(subscription.items.data[0].price.id))
    });

    console.log('サブスクリプション更新処理成功:', uid);
  } catch (error) {
    console.error('サブスクリプション更新処理エラー:', error);
  }
}

// サブスクリプション削除処理
async function handleSubscriptionDeleted(subscription) {
  console.log('サブスクリプション削除:', subscription.id);
  
  const uid = subscription.metadata?.uid;
  if (!uid) {
    console.error('UIDがメタデータに見つかりません');
    return;
  }

  try {
    await updateUserSubscription(uid, {
      status: 'canceled',
      plan: 'free',
      currentPeriodEnd: null,
      patientLimit: 5
    });

    console.log('サブスクリプション削除処理成功:', uid);
  } catch (error) {
    console.error('サブスクリプション削除処理エラー:', error);
  }
}

// 支払い成功処理
async function handlePaymentSucceeded(invoice) {
  console.log('支払い成功:', invoice.id);
  
  if (invoice.subscription) {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const uid = subscription.metadata?.uid;
      
      if (uid) {
        await updateUserSubscription(uid, {
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        });
      }
    } catch (error) {
      console.error('支払い成功処理エラー:', error);
    }
  }
}

// 支払い失敗処理
async function handlePaymentFailed(invoice) {
  console.log('支払い失敗:', invoice.id);
  
  if (invoice.subscription) {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const uid = subscription.metadata?.uid;
      
      if (uid) {
        await updateUserSubscription(uid, {
          status: subscription.status
        });
      }
    } catch (error) {
      console.error('支払い失敗処理エラー:', error);
    }
  }
}

// Firestore ユーザーサブスクリプション更新
async function updateUserSubscription(uid, subscriptionData) {
  const userRef = db.collection('users').doc(uid);
  
  const updateData = {
    'subscription.lastUpdated': admin.firestore.FieldValue.serverTimestamp()
  };

  // サブスクリプションデータを追加
  Object.keys(subscriptionData).forEach(key => {
    updateData[`subscription.${key}`] = subscriptionData[key];
  });

  await userRef.update(updateData);
  console.log('Firestore更新完了:', uid, subscriptionData);
}

// Price ID からプラン名を取得
function getPlanFromPriceId(priceId) {
  // 環境変数から Price ID のマッピングを取得
  const priceMapping = {
    [process.env.STRIPE_STANDARD_PRICE_ID]: 'standard',
    [process.env.STRIPE_PRO_PRICE_ID]: 'pro'
  };
  
  return priceMapping[priceId] || 'free';
}

// プランから患者数制限を取得
function getPatientLimitFromPlan(plan) {
  const limits = {
    'free': 5,
    'standard': 50,
    'pro': -1 // 無制限
  };
  
  return limits[plan] || 5;
}