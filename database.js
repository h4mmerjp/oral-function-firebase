// Firebase Firestore版データベース管理クラス（インデックスエラー修正版 - 既存機能との互換性維持）
class OralHealthDatabase {
  constructor() {
    this.storageKey = "oralHealthApp_backup"; // 緊急時のローカルバックアップ用
    this.isOnline = false;
    this.currentUser = null;
    this.isInitialized = false; // 初期化完了フラグを追加

    console.log("OralHealthDatabase (Firebase版) 初期化開始");
  }

  // 既存のapp.jsとの互換性のためのinit()メソッド（修正版）
  init() {
    console.log("database.init() が呼び出されました（互換性のため）");

    // 既に初期化が開始されていない場合のみ実行
    if (!this.isInitialized) {
      this.initialize();
    }

    return true; // 既存コードとの互換性のため
  }

  // 初期化処理（修正版）
  async initialize() {
    try {
      console.log("データベース初期化開始");

      // Firebase接続状況を監視
      this.setupFirebaseListener();

      this.isInitialized = true;
      console.log("データベース初期化完了");

      return true;
    } catch (error) {
      console.error("データベース初期化エラー:", error);
      this.isInitialized = false;
      return false;
    }
  }

  // Firebase接続状況監視（修正版）
  setupFirebaseListener() {
    // Firebase Managerの存在確認と監視設定を遅延実行
    const setupListener = () => {
      if (window.firebaseManager && window.firebaseManager.auth) {
        // 認証状態の変更を監視
        window.firebaseManager.auth.onAuthStateChanged((user) => {
          this.currentUser = user;
          this.isOnline = !!user;
          console.log(
            "データベース認証状態変更:",
            user ? `オンライン: ${user.email}` : "オフライン"
          );
        });
        console.log("Firebase認証監視設定完了");
      } else {
        console.log("Firebase Manager待機中...");
        // Firebase Managerがまだ利用できない場合は少し待ってから再試行
        setTimeout(setupListener, 100);
      }
    };

    setupListener();
  }

  // 初期化完了を待つ（新規追加）
  async waitForInitialization() {
    return new Promise((resolve) => {
      const checkInit = () => {
        if (this.isInitialized) {
          resolve(true);
        } else {
          setTimeout(checkInit, 50);
        }
      };
      checkInit();
    });
  }

  // Firestore参照の取得（エラーハンドリング強化）
  getFirestore() {
    if (!window.firebaseManager || !window.firebaseManager.firestore) {
      throw new Error(
        "Firebase Firestore が利用できません。ログインしてください。"
      );
    }
    return window.firebaseManager.firestore;
  }

  // ユーザー固有のコレクション取得（安全性向上）
  getUserCollection(collectionName) {
    if (!this.currentUser) {
      throw new Error("ログインが必要です");
    }

    try {
      const firestore = this.getFirestore();
      return firestore
        .collection("users")
        .doc(this.currentUser.uid)
        .collection(collectionName);
    } catch (error) {
      console.error("ユーザーコレクション取得エラー:", error);
      throw error;
    }
  }

  // オフライン時のエラーハンドリング
  handleOfflineError() {
    alert(
      "インターネット接続またはログインが必要です。\n\nオンライン機能:\n- データの保存・読み込み\n- 患者数制限管理\n- 自動バックアップ\n\nログインしてご利用ください。"
    );
  }

  // 接続状態確認（修正版）
  isConnected() {
    return this.isOnline && !!this.currentUser && this.isInitialized;
  }

  // 患者関連メソッド（エラーハンドリング強化）
  async getPatients() {
    try {
      // 初期化完了を待つ
      await this.waitForInitialization();

      if (!this.isConnected()) {
        console.log(
          "オフラインまたは未ログイン状態のため患者データを返せません"
        );
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
      await this.waitForInitialization();

      if (!this.isConnected()) {
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
      await this.waitForInitialization();

      if (!this.isConnected()) {
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

  // 重複チェック（エラーハンドリング強化）
  async checkPatientDuplication(patientData) {
    try {
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
    } catch (error) {
      if (error.message.includes("同じ患者")) {
        throw error; // 重複エラーはそのまま再スロー
      } else {
        console.error("重複チェックエラー:", error);
        // 重複チェックに失敗した場合でも作成は継続（警告のみ）
        console.warn("重複チェックをスキップして続行します");
      }
    }
  }

  async updatePatient(id, patientData) {
    try {
      await this.waitForInitialization();

      if (!this.isConnected()) {
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
      await this.waitForInitialization();

      if (!this.isConnected()) {
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

  // 検査関連メソッド（インデックスエラー修正版）
  async getAssessments(patientId = null) {
    try {
      await this.waitForInitialization();

      if (!this.isConnected()) {
        this.handleOfflineError();
        return [];
      }

      const assessmentsRef = this.getUserCollection("assessments");

      let query;
      if (patientId) {
        // 特定患者の検査データ取得時は、複合インデックス回避のためシンプルなクエリを使用
        console.log("特定患者の検査データ取得 - patient_id:", patientId);

        try {
          // まず patient_id でフィルタリングのみ実行
          query = assessmentsRef.where("patient_id", "==", patientId);
          const snapshot = await query.get();

          // クライアントサイドで日付順にソート
          const assessments = [];
          snapshot.forEach((doc) => {
            assessments.push({
              id: doc.id,
              ...doc.data(),
            });
          });

          // assessment_date で降順ソート（クライアントサイド）
          assessments.sort((a, b) => {
            const dateA = new Date(a.assessment_date || 0);
            const dateB = new Date(b.assessment_date || 0);
            return dateB - dateA;
          });

          console.log(
            `患者ID ${patientId} の検査データ ${assessments.length} 件を取得しました`
          );
          return assessments;
        } catch (indexError) {
          console.warn("患者別検査データ取得でインデックスエラー:", indexError);

          // フォールバック: 全検査データを取得してクライアントサイドでフィルタリング
          console.log("フォールバック: 全検査データからフィルタリング");
          const allSnapshot = await assessmentsRef.get();
          const filteredAssessments = [];

          allSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.patient_id === patientId) {
              filteredAssessments.push({
                id: doc.id,
                ...data,
              });
            }
          });

          // 日付順ソート
          filteredAssessments.sort((a, b) => {
            const dateA = new Date(a.assessment_date || 0);
            const dateB = new Date(b.assessment_date || 0);
            return dateB - dateA;
          });

          console.log(
            `フォールバック方式で患者ID ${patientId} の検査データ ${filteredAssessments.length} 件を取得しました`
          );
          return filteredAssessments;
        }
      } else {
        // 全検査データ取得時もシンプルなクエリを使用
        console.log("全検査データ取得");

        try {
          // まずソートなしで全データを取得
          const snapshot = await assessmentsRef.get();
          const assessments = [];

          snapshot.forEach((doc) => {
            assessments.push({
              id: doc.id,
              ...doc.data(),
            });
          });

          // クライアントサイドで日付順ソート
          assessments.sort((a, b) => {
            const dateA = new Date(a.assessment_date || 0);
            const dateB = new Date(b.assessment_date || 0);
            return dateB - dateA;
          });

          console.log(`${assessments.length} 件の検査データを取得しました`);
          return assessments;
        } catch (indexError) {
          console.warn("全検査データ取得でエラー:", indexError);
          // 基本的な取得にフォールバック
          const snapshot = await assessmentsRef.get();
          const assessments = [];

          snapshot.forEach((doc) => {
            assessments.push({
              id: doc.id,
              ...doc.data(),
            });
          });

          console.log(
            `フォールバック方式で ${assessments.length} 件の検査データを取得しました`
          );
          return assessments;
        }
      }
    } catch (error) {
      console.error("検査データ取得エラー:", error);

      // 具体的なエラーメッセージを表示
      if (error.message.includes("index")) {
        console.warn(
          "Firestoreインデックスエラーが発生しました。基本的な取得方法に切り替えます。"
        );

        try {
          // 最終フォールバック: インデックス不要の基本取得
          const assessmentsRef = this.getUserCollection("assessments");
          const snapshot = await assessmentsRef.get();
          const assessments = [];

          snapshot.forEach((doc) => {
            const data = doc.data();
            if (!patientId || data.patient_id === patientId) {
              assessments.push({
                id: doc.id,
                ...data,
              });
            }
          });

          // クライアントサイドソート
          assessments.sort((a, b) => {
            const dateA = new Date(a.assessment_date || 0);
            const dateB = new Date(b.assessment_date || 0);
            return dateB - dateA;
          });

          console.log(
            `最終フォールバック方式で ${assessments.length} 件の検査データを取得しました`
          );
          return assessments;
        } catch (fallbackError) {
          console.error("最終フォールバックも失敗:", fallbackError);
          alert(
            "検査データの取得に失敗しました。ページを再読み込みしてください。"
          );
          return [];
        }
      } else {
        alert("検査データの取得に失敗しました: " + error.message);
        return [];
      }
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
      await this.waitForInitialization();

      if (!this.isConnected()) {
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

  // 全身状態関連メソッド（インデックスエラー対応版）
  async getGeneralConditions(patientId) {
    try {
      await this.waitForInitialization();

      if (!this.isConnected()) {
        this.handleOfflineError();
        return [];
      }

      const conditionsRef = this.getUserCollection("generalConditions");

      try {
        // まず patient_id でのフィルタリングのみ試行
        const snapshot = await conditionsRef
          .where("patient_id", "==", patientId)
          .get();

        const conditions = [];
        snapshot.forEach((doc) => {
          conditions.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        // クライアントサイドで日付順ソート
        conditions.sort((a, b) => {
          const dateA = new Date(a.assessment_date || 0);
          const dateB = new Date(b.assessment_date || 0);
          return dateB - dateA;
        });

        return conditions;
      } catch (indexError) {
        console.warn("全身状態取得でインデックスエラー:", indexError);

        // フォールバック: 全データ取得後にフィルタリング
        const snapshot = await conditionsRef.get();
        const conditions = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.patient_id === patientId) {
            conditions.push({
              id: doc.id,
              ...data,
            });
          }
        });

        // クライアントサイドソート
        conditions.sort((a, b) => {
          const dateA = new Date(a.assessment_date || 0);
          const dateB = new Date(b.assessment_date || 0);
          return dateB - dateA;
        });

        return conditions;
      }
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
      await this.waitForInitialization();

      if (!this.isConnected()) {
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

  // 管理計画関連メソッド（インデックスエラー対応版）
  async getManagementPlans(patientId) {
    try {
      await this.waitForInitialization();

      if (!this.isConnected()) {
        this.handleOfflineError();
        return [];
      }

      const plansRef = this.getUserCollection("managementPlans");

      try {
        const snapshot = await plansRef
          .where("patient_id", "==", patientId)
          .get();

        const plans = [];
        snapshot.forEach((doc) => {
          plans.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        // クライアントサイドでソート
        plans.sort((a, b) => {
          const dateA = new Date(a.plan_date || 0);
          const dateB = new Date(b.plan_date || 0);
          return dateB - dateA;
        });

        return plans;
      } catch (indexError) {
        console.warn("管理計画取得でインデックスエラー:", indexError);

        // フォールバック処理
        const snapshot = await plansRef.get();
        const plans = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.patient_id === patientId) {
            plans.push({
              id: doc.id,
              ...data,
            });
          }
        });

        plans.sort((a, b) => {
          const dateA = new Date(a.plan_date || 0);
          const dateB = new Date(b.plan_date || 0);
          return dateB - dateA;
        });

        return plans;
      }
    } catch (error) {
      console.error("管理計画取得エラー:", error);
      return [];
    }
  }

  async createManagementPlan(planData) {
    try {
      await this.waitForInitialization();

      if (!this.isConnected()) {
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

  // 管理指導記録関連メソッド（インデックスエラー対応版）
  async getProgressRecords(patientId) {
    try {
      await this.waitForInitialization();

      if (!this.isConnected()) {
        this.handleOfflineError();
        return [];
      }

      const recordsRef = this.getUserCollection("progressRecords");

      try {
        const snapshot = await recordsRef
          .where("patient_id", "==", patientId)
          .get();

        const records = [];
        snapshot.forEach((doc) => {
          records.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        // クライアントサイドでソート
        records.sort((a, b) => {
          const dateA = new Date(a.record_date || 0);
          const dateB = new Date(b.record_date || 0);
          return dateB - dateA;
        });

        return records;
      } catch (indexError) {
        console.warn("管理指導記録取得でインデックスエラー:", indexError);

        // フォールバック処理
        const snapshot = await recordsRef.get();
        const records = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.patient_id === patientId) {
            records.push({
              id: doc.id,
              ...data,
            });
          }
        });

        records.sort((a, b) => {
          const dateA = new Date(a.record_date || 0);
          const dateB = new Date(b.record_date || 0);
          return dateB - dateA;
        });

        return records;
      }
    } catch (error) {
      console.error("管理指導記録取得エラー:", error);
      return [];
    }
  }

  async createProgressRecord(recordData) {
    try {
      await this.waitForInitialization();

      if (!this.isConnected()) {
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

  // ローカルストレージ版との互換性は削除 - Firebase専用
  exportData() {
    console.error("ローカルストレージ版はサポートされていません。Firebase版のexportDataAsync()を使用してください。");
    throw new Error("ローカルストレージ版はサポートされていません。Firebase版のexportDataAsync()を使用してください。");
  }

  async exportDataAsync() {
    try {
      console.log("=== exportDataAsync開始 ===");
      await this.waitForInitialization();

      if (!this.isConnected()) {
        console.error("Firebase未接続のためエクスポートできません");
        this.handleOfflineError();
        return null;
      }

      console.log("データエクスポート開始...");

      // 全てのデータを並列取得
      console.log("患者データ取得開始...");
      const patientsSnapshot = await this.getUserCollection("patients").get();
      const patients = patientsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("患者データ取得完了:", patients.length, "件");

      console.log("検査データ取得開始...");
      const assessmentsSnapshot = await this.getUserCollection("assessments").get();
      const assessments = assessmentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("検査データ取得完了:", assessments.length, "件");

      console.log("全身状態データ取得開始...");
      const generalConditionsSnapshot = await this.getUserCollection("generalConditions").get();
      const generalConditions = generalConditionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("全身状態データ取得完了:", generalConditions.length, "件");

      console.log("管理計画書データ取得開始...");
      const managementPlansSnapshot = await this.getUserCollection("managementPlans").get();
      const managementPlans = managementPlansSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("管理計画書データ取得完了:", managementPlans.length, "件");

      console.log("管理指導記録データ取得開始...");
      const progressRecordsSnapshot = await this.getUserCollection("progressRecords").get();
      const progressRecords = progressRecordsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("管理指導記録データ取得完了:", progressRecords.length, "件");

      const exportData = {
        patients: patients,
        assessments: assessments,
        generalConditions: generalConditions,
        managementPlans: managementPlans,
        progressRecords: progressRecords,
        exportDate: new Date().toISOString(),
        version: "2.0-firebase",
        user: this.currentUser?.email || "unknown",
      };

      console.log("エクスポートデータ構築完了:", {
        patients: exportData.patients.length,
        assessments: exportData.assessments.length,
        generalConditions: exportData.generalConditions.length,
        managementPlans: exportData.managementPlans.length,
        progressRecords: exportData.progressRecords.length
      });

      const jsonString = JSON.stringify(exportData, null, 2);
      console.log("JSON文字列化完了, 長さ:", jsonString.length);
      console.log("=== exportDataAsync完了 ===");
      
      return jsonString;
    } catch (error) {
      console.error("=== exportDataAsyncエラー ===", error);
      throw new Error("データのエクスポートに失敗しました: " + error.message);
    }
  }

  // 既存のapp.jsとの互換性のためのimportData（完全版）
  async importData(jsonData) {
    try {
      await this.waitForInitialization();

      if (!this.isConnected()) {
        this.handleOfflineError();
        throw new Error("オフラインのためインポートできません");
      }

      console.log("データインポート開始...");

      const importedData = JSON.parse(jsonData);

      if (!importedData.patients || !Array.isArray(importedData.patients)) {
        throw new Error("無効なデータ形式です");
      }

      console.log("インポートデータ内容:", {
        patients: importedData.patients?.length || 0,
        assessments: importedData.assessments?.length || 0,
        generalConditions: importedData.generalConditions?.length || 0,
        managementPlans: importedData.managementPlans?.length || 0,
        progressRecords: importedData.progressRecords?.length || 0
      });

      // IDマッピング用のMap
      const patientIdMap = new Map(); // 旧ID -> 新ID
      const assessmentIdMap = new Map(); // 旧ID -> 新ID

      // 患者データのインポート
      console.log("患者データインポート開始...");
      for (const patient of importedData.patients) {
        const oldPatientId = patient.id;
        const patientData = { ...patient };
        delete patientData.id; // 既存のIDを削除
        patientData.created_at = firebase.firestore.FieldValue.serverTimestamp();
        patientData.updated_at = firebase.firestore.FieldValue.serverTimestamp();

        const newPatientRef = await this.getUserCollection("patients").add(patientData);
        patientIdMap.set(oldPatientId, newPatientRef.id);
        console.log(`患者 ${patient.name} をインポート: ${oldPatientId} -> ${newPatientRef.id}`);
      }

      // 検査データのインポート
      if (importedData.assessments && importedData.assessments.length > 0) {
        console.log("検査データインポート開始...");
        for (const assessment of importedData.assessments) {
          const oldAssessmentId = assessment.id;
          const oldPatientId = assessment.patient_id;
          const newPatientId = patientIdMap.get(oldPatientId);
          
          if (newPatientId) {
            const assessmentData = { ...assessment };
            delete assessmentData.id;
            assessmentData.patient_id = newPatientId;
            assessmentData.created_at = firebase.firestore.FieldValue.serverTimestamp();
            assessmentData.updated_at = firebase.firestore.FieldValue.serverTimestamp();

            const newAssessmentRef = await this.getUserCollection("assessments").add(assessmentData);
            assessmentIdMap.set(oldAssessmentId, newAssessmentRef.id);
            console.log(`検査データをインポート: ${oldAssessmentId} -> ${newAssessmentRef.id}`);
          }
        }
      }

      // 全身状態データのインポート
      if (importedData.generalConditions && importedData.generalConditions.length > 0) {
        console.log("全身状態データインポート開始...");
        for (const condition of importedData.generalConditions) {
          const oldPatientId = condition.patient_id;
          const newPatientId = patientIdMap.get(oldPatientId);
          
          if (newPatientId) {
            const conditionData = { ...condition };
            delete conditionData.id;
            conditionData.patient_id = newPatientId;
            conditionData.created_at = firebase.firestore.FieldValue.serverTimestamp();
            conditionData.updated_at = firebase.firestore.FieldValue.serverTimestamp();

            await this.getUserCollection("generalConditions").add(conditionData);
            console.log(`全身状態データをインポート: 患者ID ${newPatientId}`);
          }
        }
      }

      // 管理計画書データのインポート
      if (importedData.managementPlans && importedData.managementPlans.length > 0) {
        console.log("管理計画書データインポート開始...");
        for (const plan of importedData.managementPlans) {
          const oldPatientId = plan.patient_id;
          const oldAssessmentId = plan.assessment_id;
          const newPatientId = patientIdMap.get(oldPatientId);
          const newAssessmentId = assessmentIdMap.get(oldAssessmentId);
          
          if (newPatientId) {
            const planData = { ...plan };
            delete planData.id;
            planData.patient_id = newPatientId;
            if (newAssessmentId) {
              planData.assessment_id = newAssessmentId;
            }
            planData.created_at = firebase.firestore.FieldValue.serverTimestamp();
            planData.updated_at = firebase.firestore.FieldValue.serverTimestamp();

            await this.getUserCollection("managementPlans").add(planData);
            console.log(`管理計画書をインポート: 患者ID ${newPatientId}`);
          }
        }
      }

      // 管理指導記録データのインポート
      if (importedData.progressRecords && importedData.progressRecords.length > 0) {
        console.log("管理指導記録データインポート開始...");
        for (const record of importedData.progressRecords) {
          const oldPatientId = record.patient_id;
          const newPatientId = patientIdMap.get(oldPatientId);
          
          if (newPatientId) {
            const recordData = { ...record };
            delete recordData.id;
            recordData.patient_id = newPatientId;
            recordData.created_at = firebase.firestore.FieldValue.serverTimestamp();
            recordData.updated_at = firebase.firestore.FieldValue.serverTimestamp();

            await this.getUserCollection("progressRecords").add(recordData);
            console.log(`管理指導記録をインポート: 患者ID ${newPatientId}`);
          }
        }
      }

      console.log("データインポート完了");
      console.log("インポート結果:", {
        患者数: patientIdMap.size,
        検査数: assessmentIdMap.size,
        全身状態: importedData.generalConditions?.length || 0,
        管理計画書: importedData.managementPlans?.length || 0,
        管理指導記録: importedData.progressRecords?.length || 0
      });
      
      return true;
    } catch (error) {
      console.error("データインポートエラー:", error);
      throw new Error("データのインポートに失敗しました: " + error.message);
    }
  }

  // 既存のapp.jsとの互換性のためのgetStatistics
  async getStatistics() {
    try {
      await this.waitForInitialization();

      if (!this.isConnected()) {
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

  // デバッグ情報
  getDebugInfo() {
    return {
      isOnline: this.isOnline,
      isInitialized: this.isInitialized,
      currentUser: this.currentUser
        ? {
            email: this.currentUser.email,
            uid: this.currentUser.uid,
          }
        : null,
      firebaseAvailable: !!window.firebaseManager,
      firestoreAvailable: !!(
        window.firebaseManager && window.firebaseManager.firestore
      ),
    };
  }
}

// グローバルインスタンス
const db = new OralHealthDatabase();

// ウィンドウオブジェクトに登録
window.db = db;

// デバッグ用
window.dbDebug = () => {
  console.log("Database Debug Info:", db.getDebugInfo());
};

console.log(
  "database.js (インデックスエラー修正版 - 既存機能との互換性維持) 読み込み完了"
);
