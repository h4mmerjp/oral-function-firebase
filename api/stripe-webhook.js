// Vercel API Function: Stripe Webhook処理
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
  // POSTメソッドのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Webhookの署名を検証
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('Webhook検証成功:', event.type);
  } catch (err) {
    console.error('Webhook署名検証失敗:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // イベントタイプに基づいて処理を分岐
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
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
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log(`未処理のイベントタイプ: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook処理エラー:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// チェックアウトセッション完了時の処理
async function handleCheckoutSessionCompleted(session) {
  console.log('チェックアウトセッション完了:', session.id);

  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('ユーザーIDがメタデータに見つかりません');
    return;
  }

  try {
    // サブスクリプション情報を取得
    const subscription = await stripe.subscriptions.retrieve(session.subscription);

    // Firestoreのユーザードキュメントを更新
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      'subscription.plan': 'premium',
      'subscription.status': subscription.status,
      'subscription.stripeCustomerId': session.customer,
      'subscription.stripeSubscriptionId': subscription.id,
      'subscription.currentPeriodStart': admin.firestore.Timestamp.fromDate(new Date(subscription.current_period_start * 1000)),
      'subscription.currentPeriodEnd': admin.firestore.Timestamp.fromDate(new Date(subscription.current_period_end * 1000)),
      'subscription.patientLimit': 999, // プレミアムは実質無制限
      'subscription.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('ユーザーサブスクリプション情報更新完了:', userId);
  } catch (error) {
    console.error('チェックアウトセッション処理エラー:', error);
    throw error;
  }
}

// サブスクリプション作成時の処理
async function handleSubscriptionCreated(subscription) {
  console.log('サブスクリプション作成:', subscription.id);

  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error('ユーザーIDがメタデータに見つかりません');
    return;
  }

  await updateUserSubscription(userId, subscription);
}

// サブスクリプション更新時の処理
async function handleSubscriptionUpdated(subscription) {
  console.log('サブスクリプション更新:', subscription.id);

  const userId = subscription.metadata?.userId;
  if (!userId) {
    // メタデータにユーザーIDがない場合、Firestoreから検索
    const usersRef = db.collection('users');
    const query = await usersRef.where('subscription.stripeSubscriptionId', '==', subscription.id).get();

    if (query.empty) {
      console.error('サブスクリプションに対応するユーザーが見つかりません:', subscription.id);
      return;
    }

    const userDoc = query.docs[0];
    await updateUserSubscription(userDoc.id, subscription);
  } else {
    await updateUserSubscription(userId, subscription);
  }
}

// サブスクリプション削除時の処理
async function handleSubscriptionDeleted(subscription) {
  console.log('サブスクリプション削除:', subscription.id);

  // Firestoreから対応するユーザーを検索
  const usersRef = db.collection('users');
  const query = await usersRef.where('subscription.stripeSubscriptionId', '==', subscription.id).get();

  if (query.empty) {
    console.error('削除されたサブスクリプションに対応するユーザーが見つかりません:', subscription.id);
    return;
  }

  const userDoc = query.docs[0];
  const userRef = db.collection('users').doc(userDoc.id);

  // 無料プランに降格
  await userRef.update({
    'subscription.plan': 'free',
    'subscription.status': 'cancelled',
    'subscription.patientLimit': 5,
    'subscription.stripeSubscriptionId': null,
    'subscription.currentPeriodStart': null,
    'subscription.currentPeriodEnd': null,
    'subscription.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('ユーザーを無料プランに降格:', userDoc.id);
}

// 請求書支払い成功時の処理
async function handleInvoicePaymentSucceeded(invoice) {
  console.log('請求書支払い成功:', invoice.id);

  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    await handleSubscriptionUpdated(subscription);
  }
}

// 請求書支払い失敗時の処理
async function handleInvoicePaymentFailed(invoice) {
  console.log('請求書支払い失敗:', invoice.id);

  // 支払い失敗の処理（必要に応じて通知など）
  // ここでは状態更新のみ実施
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    await handleSubscriptionUpdated(subscription);
  }
}

// ユーザーサブスクリプション情報を更新
async function updateUserSubscription(userId, subscription) {
  try {
    const userRef = db.collection('users').doc(userId);

    const plan = subscription.status === 'active' ? 'premium' : 'free';
    const patientLimit = subscription.status === 'active' ? 999 : 5;

    await userRef.update({
      'subscription.plan': plan,
      'subscription.status': subscription.status,
      'subscription.stripeSubscriptionId': subscription.id,
      'subscription.currentPeriodStart': admin.firestore.Timestamp.fromDate(new Date(subscription.current_period_start * 1000)),
      'subscription.currentPeriodEnd': admin.firestore.Timestamp.fromDate(new Date(subscription.current_period_end * 1000)),
      'subscription.patientLimit': patientLimit,
      'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end || false,
      'subscription.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('ユーザーサブスクリプション更新完了:', userId, plan);
  } catch (error) {
    console.error('ユーザーサブスクリプション更新エラー:', error);
    throw error;
  }
}

// Vercel用の設定：リクエストボディを生のまま取得
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}