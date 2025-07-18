// firestore.test.js - Firestore セキュリティルールのテスト

const firebase = require("@firebase/rules-unit-testing");
const fs = require("fs");

const PROJECT_ID = "oral-health-diagnosis-ap-b3592";

// テスト用のFirestoreインスタンスを作成
function getFirestore(auth) {
  return firebase
    .initializeTestApp({
      projectId: PROJECT_ID,
      auth: auth,
    })
    .firestore();
}

// 管理者用Firestoreインスタンス
function getAdminFirestore() {
  return firebase
    .initializeAdminApp({
      projectId: PROJECT_ID,
    })
    .firestore();
}

// 各テスト前にデータをクリア
beforeEach(async () => {
  await firebase.clearFirestoreData({ projectId: PROJECT_ID });
});

// テスト完了後にクリーンアップ
afterAll(async () => {
  await firebase.cleanup();
});

describe("口腔機能低下症アプリ - セキュリティルールテスト", () => {
  // ==========================================
  // 認証テスト
  // ==========================================

  describe("認証が必要なアクセス制御", () => {
    test("❌ 未認証ユーザーは患者データにアクセスできない", async () => {
      const db = getFirestore(null); // 未認証
      const patientRef = db.collection("users/user1/patients").doc("patient1");

      await firebase.assertFails(patientRef.get());
    });

    test("✅ 認証済みユーザーは自分の患者データにアクセスできる", async () => {
      const db = getFirestore({ uid: "user1", email: "user1@hospital.jp" });
      const patientRef = db.collection("users/user1/patients").doc("patient1");

      // まずデータを作成
      const adminDb = getAdminFirestore();
      await adminDb.collection("users/user1/patients").doc("patient1").set({
        name: "田中太郎",
        patient_id: "P001",
      });

      await firebase.assertSucceeds(patientRef.get());
    });

    test("❌ 認証済みユーザーは他人の患者データにアクセスできない", async () => {
      const db = getFirestore({ uid: "user1", email: "user1@hospital.jp" });
      const patientRef = db.collection("users/user2/patients").doc("patient1");

      await firebase.assertFails(patientRef.get());
    });
  });

  // ==========================================
  // 患者データの読み書きテスト
  // ==========================================

  describe("患者データの操作", () => {
    test("✅ 有効なデータで患者を作成できる", async () => {
      const db = getFirestore({ uid: "user1", email: "user1@hospital.jp" });
      const patientRef = db
        .collection("users/user1/patients")
        .doc("newPatient");

      await firebase.assertSucceeds(
        patientRef.set({
          name: "田中太郎",
          patient_id: "P001",
          name_kana: "タナカ タロウ",
          birthdate: "1950-01-01",
          gender: "male",
          created_at: new Date(),
        })
      );
    });

    test("❌ 必須項目がない場合は患者を作成できない", async () => {
      const db = getFirestore({ uid: "user1", email: "user1@hospital.jp" });
      const patientRef = db
        .collection("users/user1/patients")
        .doc("invalidPatient");

      await firebase.assertFails(
        patientRef.set({
          // nameが欠如
          patient_id: "P001",
        })
      );
    });

    test("❌ 無効な患者IDでは患者を作成できない", async () => {
      const db = getFirestore({ uid: "user1", email: "user1@hospital.jp" });
      const patientRef = db
        .collection("users/user1/patients")
        .doc("invalidPatient");

      await firebase.assertFails(
        patientRef.set({
          name: "田中太郎",
          patient_id: "P001<script>", // 無効な文字を含む
        })
      );
    });

    test("✅ 自分の患者データを更新できる", async () => {
      const db = getFirestore({ uid: "user1", email: "user1@hospital.jp" });
      const patientRef = db.collection("users/user1/patients").doc("patient1");

      // まずデータを作成
      await patientRef.set({
        name: "田中太郎",
        patient_id: "P001",
      });

      // 更新
      await firebase.assertSucceeds(
        patientRef.update({
          phone: "03-1234-5678",
        })
      );
    });

    test("✅ 自分の患者データを削除できる", async () => {
      const db = getFirestore({ uid: "user1", email: "user1@hospital.jp" });
      const patientRef = db.collection("users/user1/patients").doc("patient1");

      // まずデータを作成
      await patientRef.set({
        name: "田中太郎",
        patient_id: "P001",
      });

      // 削除
      await firebase.assertSucceeds(patientRef.delete());
    });
  });

  // ==========================================
  // 検査データのテスト
  // ==========================================

  describe("検査データの操作", () => {
    test("✅ 有効な検査データを作成できる", async () => {
      const db = getFirestore({ uid: "user1", email: "user1@hospital.jp" });
      const assessmentRef = db
        .collection("users/user1/assessments")
        .doc("assessment1");

      await firebase.assertSucceeds(
        assessmentRef.set({
          patient_id: "patient1",
          assessment_date: "2025-01-15",
          tci_value: 45,
          diagnosis_result: false,
          affected_items_count: 2,
        })
      );
    });

    test("❌ 必須項目がない検査データは作成できない", async () => {
      const db = getFirestore({ uid: "user1", email: "user1@hospital.jp" });
      const assessmentRef = db
        .collection("users/user1/assessments")
        .doc("assessment1");

      await firebase.assertFails(
        assessmentRef.set({
          // patient_idとassessment_dateが欠如
          tci_value: 45,
        })
      );
    });

    test("✅ 自分の検査データを読み取れる", async () => {
      const db = getFirestore({ uid: "user1", email: "user1@hospital.jp" });
      const assessmentRef = db
        .collection("users/user1/assessments")
        .doc("assessment1");

      // 管理者権限でデータを作成
      const adminDb = getAdminFirestore();
      await adminDb
        .collection("users/user1/assessments")
        .doc("assessment1")
        .set({
          patient_id: "patient1",
          assessment_date: "2025-01-15",
        });

      await firebase.assertSucceeds(assessmentRef.get());
    });
  });

  // ==========================================
  // その他のコレクションテスト
  // ==========================================

  describe("その他のコレクション", () => {
    test("✅ 全身状態データを作成できる", async () => {
      const db = getFirestore({ uid: "user1", email: "user1@hospital.jp" });
      const conditionRef = db
        .collection("users/user1/generalConditions")
        .doc("condition1");

      await firebase.assertSucceeds(
        conditionRef.set({
          patient_id: "patient1",
          height: 170,
          weight: 65,
          diseases: '["diabetes"]',
        })
      );
    });

    test("✅ 管理計画書を作成できる", async () => {
      const db = getFirestore({ uid: "user1", email: "user1@hospital.jp" });
      const planRef = db.collection("users/user1/managementPlans").doc("plan1");

      await firebase.assertSucceeds(
        planRef.set({
          patient_id: "patient1",
          assessment_id: "assessment1",
          plan_date: "2025-01-15",
          hygiene_plan: 2,
        })
      );
    });

    test("✅ 管理指導記録を作成できる", async () => {
      const db = getFirestore({ uid: "user1", email: "user1@hospital.jp" });
      const recordRef = db
        .collection("users/user1/progressRecords")
        .doc("record1");

      await firebase.assertSucceeds(
        recordRef.set({
          patient_id: "patient1",
          record_date: "2025-01-15",
          nutrition_rating: 2,
        })
      );
    });
  });

  // ==========================================
  // 不正なアクセステスト
  // ==========================================

  describe("不正なアクセスの防止", () => {
    test("❌ ルートレベルでの直接アクセスは拒否", async () => {
      const db = getFirestore({ uid: "user1", email: "user1@hospital.jp" });
      const rootRef = db.collection("patients").doc("patient1");

      await firebase.assertFails(rootRef.get());
    });

    test("❌ 管理者エリアへの一般ユーザーアクセスは拒否", async () => {
      const db = getFirestore({ uid: "user1", email: "user1@hospital.jp" });
      const adminRef = db.collection("admin").doc("config");

      await firebase.assertFails(adminRef.get());
    });

    test("❌ 他のユーザーコレクションへのアクセスは拒否", async () => {
      const db = getFirestore({ uid: "user1", email: "user1@hospital.jp" });
      const otherUserRef = db
        .collection("users/user2/patients")
        .doc("patient1");

      await firebase.assertFails(otherUserRef.get());
    });
  });

  // ==========================================
  // 監査ログテスト
  // ==========================================

  describe("監査ログ", () => {
    test("✅ 監査ログを作成できる", async () => {
      const db = getFirestore({ uid: "user1", email: "user1@hospital.jp" });
      const logRef = db.collection("audit_logs").doc("log1");

      await firebase.assertSucceeds(
        logRef.set({
          userId: "user1",
          action: "CREATE_PATIENT",
          timestamp: new Date(),
          details: "Patient created successfully",
        })
      );
    });

    test("✅ 自分に関する監査ログを読み取れる", async () => {
      const db = getFirestore({ uid: "user1", email: "user1@hospital.jp" });

      // 管理者権限でログを作成
      const adminDb = getAdminFirestore();
      await adminDb.collection("audit_logs").doc("log1").set({
        userId: "user1",
        action: "CREATE_PATIENT",
      });

      const logRef = db.collection("audit_logs").doc("log1");
      await firebase.assertSucceeds(logRef.get());
    });
  });
});

// ==========================================
// パフォーマンステスト
// ==========================================

describe("パフォーマンステスト", () => {
  test("大量データの一括読み取り制限", async () => {
    const db = getFirestore({ uid: "user1", email: "user1@hospital.jp" });

    // 大量の患者データを作成
    const adminDb = getAdminFirestore();
    const batch = adminDb.batch();

    for (let i = 0; i < 100; i++) {
      const ref = adminDb.collection("users/user1/patients").doc(`patient${i}`);
      batch.set(ref, {
        name: `患者${i}`,
        patient_id: `P${i.toString().padStart(3, "0")}`,
      });
    }
    await batch.commit();

    // 一括読み取りテスト
    const querySnapshot = db.collection("users/user1/patients").limit(50);
    await firebase.assertSucceeds(querySnapshot.get());
  });
});

console.log("🧪 Firestore セキュリティルールテストを実行中...");
console.log("📊 テスト結果を確認してください");
