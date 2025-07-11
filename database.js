// Firebase Firestore版データベース管理クラス
class OralHealthDatabase {
  constructor() {
    this.storageKey = "oralHealthApp_backup"; // 緊急時のローカルバックアップ用
    this.isOnline = false;
    this.currentUser = null;

    // Firebase接続状況を監視
    this.setupFirebaseListener();

    console.log("OralHealthDatabase (Firebase版) が初期化されました");
  }

  // Firebase接続状況監視
  setupFirebaseListener() {
    if (window.firebaseManager) {
      // 認証状態の変更を監視
      if (firebaseManager.auth) {
        firebaseManager.auth.onAuthStateChanged((user) => {
          this.currentUser = user;
          this.isOnline = !!user;
          console.log(
            "データベース認証状態変更:",
            user ? `オンライン: ${user.email}` : "オフライン"
          );
        });
      }
    }
  }

  // Firestore参照の取得
  getFirestore() {
    if (!window.firebaseManager || !firebaseManager.firestore) {
      throw new Error(
        "Firebase Firestore が利用できません。ログインしてください。"
      );
    }
    return firebaseManager.firestore;
  }

  // ユーザー固有のコレクション取得
  getUserCollection(collectionName) {
    if (!this.currentUser) {
      throw new Error("ログインが必要です");
    }

    const firestore = this.getFirestore();
    return firestore
      .collection("users")
      .doc(this.currentUser.uid)
      .collection(collectionName);
  }

  // オフライン時のエラーハンドリング
  handleOfflineError() {
    alert(
      "インターネット接続またはログインが必要です。\n\nオンライン機能:\n- データの保存・読み込み\n- 患者数制限管理\n- 自動バックアップ\n\nログインしてご利用ください。"
    );
  }

  // 患者関連メソッド
  async getPatients() {
    try {
      if (!this.isOnline) {
        this.handleOfflineError();
        return [];
      }

      console.log("Firebase から患者一覧を取得中...");
      const patientsRef = this.getUserCollection("patients");
      const snapshot = await patientsRef.orderBy("updated_at", "desc").get();

      const patients = [];
      snapshot.forEach((doc) => {
        patients.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      console.log(`${patients.length} 人の患者データを取得しました`);
      return patients;
    } catch (error) {
      console.error("患者一覧取得エラー:", error);

      if (error.code === "permission-denied") {
        alert("データアクセス権限がありません。ログインし直してください。");
      } else if (error.code === "unavailable") {
        alert("インターネット接続を確認してください。");
      } else {
        alert("患者データの取得に失敗しました: " + error.message);
      }

      return [];
    }
  }

  async getPatient(id) {
    try {
      if (!this.isOnline) {
        this.handleOfflineError();
        return null;
      }

      console.log("患者データ取得:", id);
      const patientsRef = this.getUserCollection("patients");
      const doc = await patientsRef.doc(id).get();

      if (doc.exists) {
        const patient = {
          id: doc.id,
          ...doc.data(),
        };
        console.log("患者データ取得成功:", patient);
        return patient;
      } else {
        console.warn("患者が見つかりません:", id);
        return null;
      }
    } catch (error) {
      console.error("患者取得エラー:", error);
      alert("患者情報の取得に失敗しました: " + error.message);
      return null;
    }
  }

  async createPatient(patientData) {
    try {
      if (!this.isOnline) {
        this.handleOfflineError();
        throw new Error("オフラインのため患者を作成できません");
      }

      console.log("新規患者作成:", patientData);

      // 重複チェック
      await this.checkPatientDuplication(patientData);

      const patientsRef = this.getUserCollection("patients");

      const newPatient = {
        ...patientData,
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
        updated_at: firebase.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await patientsRef.add(newPatient);

      // 作成されたドキュメントを取得
      const createdDoc = await docRef.get();
      const result = {
        id: createdDoc.id,
        ...createdDoc.data(),
        created_at: new Date(), // タイムスタンプを Date オブジェクトに変換
        updated_at: new Date(),
      };

      console.log("患者作成成功:", result);
      return result;
    } catch (error) {
      console.error("患者作成エラー:", error);

      if (error.message.includes("重複")) {
        throw error; // 重複エラーはそのまま再スロー
      } else {
        throw new Error("患者の作成に失敗しました: " + error.message);
      }
    }
  }

  // 重複チェック
  async checkPatientDuplication(patientData) {
    const patientsRef = this.getUserCollection("patients");

    // 患者IDの重複チェック
    if (patientData.patient_id) {
      const idQuery = await patientsRef
        .where("patient_id", "==", patientData.patient_id)
        .get();
      if (!idQuery.empty) {
        throw new Error("同じ患者IDが既に存在します");
      }
    }

    // 名前+生年月日の重複チェック
    if (patientData.name && patientData.birthdate) {
      const nameQuery = await patientsRef
        .where("name", "==", patientData.name)
        .where("birthdate", "==", patientData.birthdate)
        .get();

      if (!nameQuery.empty) {
        throw new Error("同じ患者情報（名前+生年月日）が既に存在します");
      }
    }
  }

  async updatePatient(id, patientData) {
    try {
      if (!this.isOnline) {
        this.handleOfflineError();
        throw new Error("オフラインのため患者を更新できません");
      }

      console.log("患者更新:", id, patientData);

      const patientsRef = this.getUserCollection("patients");
      const docRef = patientsRef.doc(id);

      // ドキュメントの存在確認
      const doc = await docRef.get();
      if (!doc.exists) {
        throw new Error("更新対象の患者が見つかりません");
      }

      const updateData = {
        ...patientData,
        updated_at: firebase.firestore.FieldValue.serverTimestamp(),
      };

      await docRef.update(updateData);

      // 更新後のデータを取得
      const updatedDoc = await docRef.get();
      const result = {
        id: updatedDoc.id,
        ...updatedDoc.data(),
        updated_at: new Date(),
      };

      console.log("患者更新成功:", result);
      return result;
    } catch (error) {
      console.error("患者更新エラー:", error);
      throw new Error("患者情報の更新に失敗しました: " + error.message);
    }
  }

  async deletePatient(id) {
    try {
      if (!this.isOnline) {
        this.handleOfflineError();
        return;
      }

      console.log("患者削除開始:", id);

      const batch = this.getFirestore().batch();

      // 患者ドキュメントを削除
      const patientRef = this.getUserCollection("patients").doc(id);
      batch.delete(patientRef);

      // 関連データも削除
      const collections = [
        "assessments",
        "generalConditions",
        "managementPlans",
        "progressRecords",
      ];

      for (const collectionName of collections) {
        const collectionRef = this.getUserCollection(collectionName);
        const relatedDocs = await collectionRef
          .where("patient_id", "==", id)
          .get();

        relatedDocs.forEach((doc) => {
          batch.delete(doc.ref);
        });
      }

      await batch.commit();
      console.log("患者削除完了:", id);
    } catch (error) {
      console.error("患者削除エラー:", error);
      throw new Error("患者の削除に失敗しました: " + error.message);
    }
  }

  // 検査関連メソッド
  async getAssessments(patientId = null) {
    try {
      if (!this.isOnline) {
        this.handleOfflineError();
        return [];
      }

      const assessmentsRef = this.getUserCollection("assessments");
      let query = assessmentsRef.orderBy("assessment_date", "desc");

      if (patientId) {
        query = query.where("patient_id", "==", patientId);
      }

      const snapshot = await query.get();

      const assessments = [];
      snapshot.forEach((doc) => {
        assessments.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      console.log(`${assessments.length} 件の検査データを取得しました`);
      return assessments;
    } catch (error) {
      console.error("検査データ取得エラー:", error);
      alert("検査データの取得に失敗しました: " + error.message);
      return [];
    }
  }

  async getLatestAssessment(patientId) {
    try {
      const assessments = await this.getAssessments(patientId);
      return assessments.length > 0 ? assessments[0] : null;
    } catch (error) {
      console.error("最新検査データ取得エラー:", error);
      return null;
    }
  }

  async createAssessment(assessmentData) {
    try {
      if (!this.isOnline) {
        this.handleOfflineError();
        throw new Error("オフラインのため検査データを保存できません");
      }

      console.log("検査データ作成:", assessmentData);

      const assessmentsRef = this.getUserCollection("assessments");

      const newAssessment = {
        ...assessmentData,
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await assessmentsRef.add(newAssessment);

      const createdDoc = await docRef.get();
      const result = {
        id: createdDoc.id,
        ...createdDoc.data(),
        created_at: new Date(),
      };

      console.log("検査データ作成成功:", result);
      return result;
    } catch (error) {
      console.error("検査データ作成エラー:", error);
      throw new Error("検査データの保存に失敗しました: " + error.message);
    }
  }

  // 全身状態関連メソッド
  async getGeneralConditions(patientId) {
    try {
      if (!this.isOnline) {
        this.handleOfflineError();
        return [];
      }

      const conditionsRef = this.getUserCollection("generalConditions");
      const snapshot = await conditionsRef
        .where("patient_id", "==", patientId)
        .orderBy("assessment_date", "desc")
        .get();

      const conditions = [];
      snapshot.forEach((doc) => {
        conditions.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return conditions;
    } catch (error) {
      console.error("全身状態取得エラー:", error);
      return [];
    }
  }

  async getLatestGeneralCondition(patientId) {
    try {
      const conditions = await this.getGeneralConditions(patientId);
      return conditions.length > 0 ? conditions[0] : null;
    } catch (error) {
      console.error("最新全身状態取得エラー:", error);
      return null;
    }
  }

  async createGeneralCondition(conditionData) {
    try {
      if (!this.isOnline) {
        this.handleOfflineError();
        throw new Error("オフラインのため全身状態を保存できません");
      }

      const conditionsRef = this.getUserCollection("generalConditions");

      const newCondition = {
        ...conditionData,
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await conditionsRef.add(newCondition);

      const createdDoc = await docRef.get();
      const result = {
        id: createdDoc.id,
        ...createdDoc.data(),
        created_at: new Date(),
      };

      console.log("全身状態作成成功:", result);
      return result;
    } catch (error) {
      console.error("全身状態作成エラー:", error);
      throw new Error("全身状態の保存に失敗しました: " + error.message);
    }
  }

  // 管理計画関連メソッド
  async getManagementPlans(patientId) {
    try {
      if (!this.isOnline) {
        this.handleOfflineError();
        return [];
      }

      const plansRef = this.getUserCollection("managementPlans");
      const snapshot = await plansRef
        .where("patient_id", "==", patientId)
        .orderBy("plan_date", "desc")
        .get();

      const plans = [];
      snapshot.forEach((doc) => {
        plans.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return plans;
    } catch (error) {
      console.error("管理計画取得エラー:", error);
      return [];
    }
  }

  async createManagementPlan(planData) {
    try {
      if (!this.isOnline) {
        this.handleOfflineError();
        throw new Error("オフラインのため管理計画を保存できません");
      }

      const plansRef = this.getUserCollection("managementPlans");

      const newPlan = {
        ...planData,
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await plansRef.add(newPlan);

      const createdDoc = await docRef.get();
      const result = {
        id: createdDoc.id,
        ...createdDoc.data(),
        created_at: new Date(),
      };

      console.log("管理計画作成成功:", result);
      return result;
    } catch (error) {
      console.error("管理計画作成エラー:", error);
      throw new Error("管理計画の保存に失敗しました: " + error.message);
    }
  }

  // 管理指導記録関連メソッド
  async getProgressRecords(patientId) {
    try {
      if (!this.isOnline) {
        this.handleOfflineError();
        return [];
      }

      const recordsRef = this.getUserCollection("progressRecords");
      const snapshot = await recordsRef
        .where("patient_id", "==", patientId)
        .orderBy("record_date", "desc")
        .get();

      const records = [];
      snapshot.forEach((doc) => {
        records.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return records;
    } catch (error) {
      console.error("管理指導記録取得エラー:", error);
      return [];
    }
  }

  async createProgressRecord(recordData) {
    try {
      if (!this.isOnline) {
        this.handleOfflineError();
        throw new Error("オフラインのため管理指導記録を保存できません");
      }

      const recordsRef = this.getUserCollection("progressRecords");

      const newRecord = {
        ...recordData,
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await recordsRef.add(newRecord);

      const createdDoc = await docRef.get();
      const result = {
        id: createdDoc.id,
        ...createdDoc.data(),
        created_at: new Date(),
      };

      console.log("管理指導記録作成成功:", result);
      return result;
    } catch (error) {
      console.error("管理指導記録作成エラー:", error);
      throw new Error("管理指導記録の保存に失敗しました: " + error.message);
    }
  }

  // データのエクスポート（Firebase版）
  async exportData() {
    try {
      if (!this.isOnline) {
        this.handleOfflineError();
        return null;
      }

      console.log("データエクスポート開始...");

      const [
        patients,
        assessments,
        generalConditions,
        managementPlans,
        progressRecords,
      ] = await Promise.all([
        this.getPatients(),
        this.getAssessments(),
        this.getUserCollection("generalConditions").get(),
        this.getUserCollection("managementPlans").get(),
        this.getUserCollection("progressRecords").get(),
      ]);

      const exportData = {
        patients: patients,
        assessments: assessments,
        generalConditions: generalConditions.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
        managementPlans: managementPlans.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
        progressRecords: progressRecords.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
        exportDate: new Date().toISOString(),
        version: "2.0-firebase",
        user: this.currentUser.email,
      };

      console.log("データエクスポート完了");
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error("データエクスポートエラー:", error);
      alert("データのエクスポートに失敗しました: " + error.message);
      return null;
    }
  }

  // データのインポート（Firebase版）
  async importData(jsonData) {
    try {
      if (!this.isOnline) {
        this.handleOfflineError();
        throw new Error("オフラインのためインポートできません");
      }

      console.log("データインポート開始...");

      const importedData = JSON.parse(jsonData);

      if (!importedData.patients || !Array.isArray(importedData.patients)) {
        throw new Error("無効なデータ形式です");
      }

      if (
        !confirm(
          `${importedData.patients.length} 人の患者データをインポートしますか？\n既存のデータは保持されます。`
        )
      ) {
        return false;
      }

      const batch = this.getFirestore().batch();

      // 患者データのインポート
      importedData.patients.forEach((patient) => {
        const patientRef = this.getUserCollection("patients").doc();
        const patientData = { ...patient };
        delete patientData.id; // 既存のIDを削除
        patientData.created_at =
          firebase.firestore.FieldValue.serverTimestamp();
        patientData.updated_at =
          firebase.firestore.FieldValue.serverTimestamp();

        batch.set(patientRef, patientData);
      });

      await batch.commit();

      console.log("データインポート完了");
      alert("データのインポートが完了しました");
      return true;
    } catch (error) {
      console.error("データインポートエラー:", error);
      throw new Error("データのインポートに失敗しました: " + error.message);
    }
  }

  // 統計情報（Firebase版）
  async getStatistics() {
    try {
      if (!this.isOnline) {
        return {
          totalPatients: 0,
          totalAssessments: 0,
          diagnosedPatients: 0,
          normalPatients: 0,
          message: "オフライン - ログインして統計を確認",
        };
      }

      const [patients, assessments] = await Promise.all([
        this.getPatients(),
        this.getAssessments(),
      ]);

      const totalPatients = patients.length;
      const totalAssessments = assessments.length;

      // 診断済み患者数の計算
      const diagnosedPatientIds = new Set();
      assessments.forEach((assessment) => {
        if (assessment.diagnosis_result) {
          diagnosedPatientIds.add(assessment.patient_id);
        }
      });

      return {
        totalPatients,
        totalAssessments,
        diagnosedPatients: diagnosedPatientIds.size,
        normalPatients: totalPatients - diagnosedPatientIds.size,
        user: this.currentUser?.email || "unknown",
      };
    } catch (error) {
      console.error("統計情報取得エラー:", error);
      return {
        totalPatients: 0,
        totalAssessments: 0,
        diagnosedPatients: 0,
        normalPatients: 0,
        error: error.message,
      };
    }
  }

  // 接続状態確認
  isConnected() {
    return this.isOnline && !!this.currentUser;
  }

  // デバッグ情報
  getDebugInfo() {
    return {
      isOnline: this.isOnline,
      currentUser: this.currentUser
        ? {
            email: this.currentUser.email,
            uid: this.currentUser.uid,
          }
        : null,
      firebaseAvailable: !!window.firebaseManager,
      firestoreAvailable: !!(
        window.firebaseManager && firebaseManager.firestore
      ),
    };
  }
}

// グローバルインスタンス
const db = new OralHealthDatabase();

// デバッグ用
window.dbDebug = () => {
  console.log("Database Debug Info:", db.getDebugInfo());
};

console.log("database.js (Firebase版) 読み込み完了");
