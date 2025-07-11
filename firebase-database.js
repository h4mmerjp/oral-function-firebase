// Firebase Firestore連携データベースクラス
class FirebaseDatabase {
  constructor() {
    this.isFirebaseEnabled = false;
    this.currentUser = null;
    this.firestore = null;

    console.log("FirebaseDatabase 初期化開始");
  }

  // Firebase初期化確認
  async initialize() {
    try {
      if (!window.firebaseManager || !firebaseManager.isAvailable()) {
        console.log("Firebase未利用 - ローカルモードで動作");
        return false;
      }

      this.firestore = firebaseManager.firestore;
      this.isFirebaseEnabled = true;

      // 認証状態の監視
      firebaseManager.auth.onAuthStateChanged((user) => {
        this.currentUser = user;
        console.log("Firebase認証状態変更:", user ? user.email : "ログアウト");
      });

      console.log("FirebaseDatabase 初期化完了");
      return true;
    } catch (error) {
      console.error("FirebaseDatabase 初期化エラー:", error);
      this.isFirebaseEnabled = false;
      return false;
    }
  }

  // Firebase利用可能かチェック
  isEnabled() {
    return this.isFirebaseEnabled && this.currentUser && this.firestore;
  }

  // ユーザー専用コレクションパスを取得
  getUserCollectionPath(collectionName) {
    if (!this.currentUser) {
      throw new Error("ユーザーがログインしていません");
    }
    return `users/${this.currentUser.uid}/${collectionName}`;
  }

  // Firestore用のデータ変換（Timestampなどの処理）
  convertToFirestore(data) {
    const converted = { ...data };

    // 日付文字列をTimestampに変換
    const dateFields = [
      "created_at",
      "updated_at",
      "assessment_date",
      "plan_date",
      "record_date",
    ];
    dateFields.forEach((field) => {
      if (converted[field]) {
        try {
          converted[field] = firebase.firestore.Timestamp.fromDate(
            new Date(converted[field])
          );
        } catch (error) {
          console.warn(`日付変換エラー (${field}):`, error);
        }
      }
    });

    // IDフィールドを削除（Firestoreが自動生成）
    delete converted.id;

    return converted;
  }

  // Firestoreからのデータ変換
  convertFromFirestore(doc) {
    if (!doc.exists) return null;

    const data = doc.data();
    const converted = {
      id: doc.id,
      ...data,
    };

    // TimestampをISO文字列に変換
    Object.keys(converted).forEach((key) => {
      if (converted[key] && typeof converted[key].toDate === "function") {
        converted[key] = converted[key].toDate().toISOString();
      }
    });

    return converted;
  }

  // 患者データの同期
  async syncPatients() {
    if (!this.isEnabled()) {
      console.log("Firebase未有効 - 患者同期スキップ");
      return;
    }

    try {
      console.log("患者データ同期開始");

      // ローカルデータを取得
      const localPatients = await window.db.getPatients();
      console.log("ローカル患者数:", localPatients.length);

      // Firestoreから既存データを取得
      const patientsRef = this.firestore.collection(
        this.getUserCollectionPath("patients")
      );
      const snapshot = await patientsRef.get();

      const firebasePatients = [];
      snapshot.forEach((doc) => {
        const patient = this.convertFromFirestore(doc);
        if (patient) firebasePatients.push(patient);
      });

      console.log("Firebase患者数:", firebasePatients.length);

      // ローカルデータをFirebaseに同期
      const batch = this.firestore.batch();
      let batchCount = 0;

      for (const localPatient of localPatients) {
        // patient_idで既存チェック
        const existingPatient = firebasePatients.find(
          (fp) => fp.patient_id === localPatient.patient_id
        );

        if (!existingPatient) {
          // 新規患者をFirebaseに追加
          const docRef = patientsRef.doc();
          const firestoreData = this.convertToFirestore(localPatient);
          batch.set(docRef, firestoreData);
          batchCount++;

          console.log("Firebase同期予定:", localPatient.name);
        }
      }

      if (batchCount > 0) {
        await batch.commit();
        console.log(`${batchCount}人の患者をFirebaseに同期完了`);
      } else {
        console.log("同期が必要な患者はありません");
      }
    } catch (error) {
      console.error("患者同期エラー:", error);
      throw error;
    }
  }

  // 患者作成（Firebase + ローカル）
  async createPatient(patientData) {
    try {
      // まずローカルに作成
      const localPatient = await window.db.createPatient(patientData);
      console.log("ローカル患者作成完了:", localPatient.name);

      // Firebaseに同期
      if (this.isEnabled()) {
        try {
          const patientsRef = this.firestore.collection(
            this.getUserCollectionPath("patients")
          );
          const firestoreData = this.convertToFirestore(localPatient);

          const docRef = await patientsRef.add(firestoreData);
          console.log("Firebase患者作成完了:", docRef.id);

          // ローカルデータにFirebase IDを関連付け（オプション）
          localPatient.firebase_id = docRef.id;
        } catch (firebaseError) {
          console.error("Firebase患者作成エラー:", firebaseError);
          // Firebase失敗時もローカル作成は成功として扱う
        }
      }

      return localPatient;
    } catch (error) {
      console.error("患者作成エラー:", error);
      throw error;
    }
  }

  // 患者更新（Firebase + ローカル）
  async updatePatient(id, patientData) {
    try {
      // まずローカルを更新
      const localPatient = await window.db.updatePatient(id, patientData);
      console.log("ローカル患者更新完了:", localPatient.name);

      // Firebaseに同期
      if (this.isEnabled()) {
        try {
          const patientsRef = this.firestore.collection(
            this.getUserCollectionPath("patients")
          );

          // patient_idで検索してFirebaseドキュメントを更新
          const querySnapshot = await patientsRef
            .where("patient_id", "==", localPatient.patient_id)
            .get();

          if (!querySnapshot.empty) {
            const batch = this.firestore.batch();
            querySnapshot.forEach((doc) => {
              const firestoreData = this.convertToFirestore(localPatient);
              batch.update(doc.ref, firestoreData);
            });

            await batch.commit();
            console.log("Firebase患者更新完了");
          }
        } catch (firebaseError) {
          console.error("Firebase患者更新エラー:", firebaseError);
        }
      }

      return localPatient;
    } catch (error) {
      console.error("患者更新エラー:", error);
      throw error;
    }
  }

  // 患者削除（Firebase + ローカル）
  async deletePatient(id) {
    try {
      // 削除対象患者を取得
      const targetPatient = await window.db.getPatient(id);

      if (!targetPatient) {
        console.warn("削除対象患者が見つかりません:", id);
        return;
      }

      // ローカルから削除
      await window.db.deletePatient(id);
      console.log("ローカル患者削除完了:", targetPatient.name);

      // Firebaseから削除
      if (this.isEnabled()) {
        try {
          const patientsRef = this.firestore.collection(
            this.getUserCollectionPath("patients")
          );

          // patient_idで検索してFirebaseドキュメントを削除
          const querySnapshot = await patientsRef
            .where("patient_id", "==", targetPatient.patient_id)
            .get();

          if (!querySnapshot.empty) {
            const batch = this.firestore.batch();
            querySnapshot.forEach((doc) => {
              batch.delete(doc.ref);
            });

            await batch.commit();
            console.log("Firebase患者削除完了");
          }

          // 関連データも削除
          await this.deletePatientRelatedData(targetPatient.patient_id);
        } catch (firebaseError) {
          console.error("Firebase患者削除エラー:", firebaseError);
        }
      }
    } catch (error) {
      console.error("患者削除エラー:", error);
      throw error;
    }
  }

  // 患者関連データの削除
  async deletePatientRelatedData(patientId) {
    if (!this.isEnabled()) return;

    try {
      const batch = this.firestore.batch();
      const collections = [
        "assessments",
        "generalConditions",
        "managementPlans",
        "progressRecords",
      ];

      for (const collectionName of collections) {
        const ref = this.firestore.collection(
          this.getUserCollectionPath(collectionName)
        );
        const snapshot = await ref.where("patient_id", "==", patientId).get();

        snapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
      }

      await batch.commit();
      console.log("患者関連データ削除完了");
    } catch (error) {
      console.error("患者関連データ削除エラー:", error);
    }
  }

  // 検査データ作成（Firebase + ローカル）
  async createAssessment(assessmentData) {
    try {
      // まずローカルに作成
      const localAssessment = await window.db.createAssessment(assessmentData);
      console.log("ローカル検査作成完了");

      // Firebaseに同期
      if (this.isEnabled()) {
        try {
          const assessmentsRef = this.firestore.collection(
            this.getUserCollectionPath("assessments")
          );
          const firestoreData = this.convertToFirestore(localAssessment);

          const docRef = await assessmentsRef.add(firestoreData);
          console.log("Firebase検査作成完了:", docRef.id);
        } catch (firebaseError) {
          console.error("Firebase検査作成エラー:", firebaseError);
        }
      }

      return localAssessment;
    } catch (error) {
      console.error("検査作成エラー:", error);
      throw error;
    }
  }

  // 全身状態作成（Firebase + ローカル）
  async createGeneralCondition(conditionData) {
    try {
      // まずローカルに作成
      const localCondition = await window.db.createGeneralCondition(
        conditionData
      );
      console.log("ローカル全身状態作成完了");

      // Firebaseに同期
      if (this.isEnabled()) {
        try {
          const conditionsRef = this.firestore.collection(
            this.getUserCollectionPath("generalConditions")
          );
          const firestoreData = this.convertToFirestore(localCondition);

          const docRef = await conditionsRef.add(firestoreData);
          console.log("Firebase全身状態作成完了:", docRef.id);
        } catch (firebaseError) {
          console.error("Firebase全身状態作成エラー:", firebaseError);
        }
      }

      return localCondition;
    } catch (error) {
      console.error("全身状態作成エラー:", error);
      throw error;
    }
  }

  // 管理計画作成（Firebase + ローカル）
  async createManagementPlan(planData) {
    try {
      // まずローカルに作成
      const localPlan = await window.db.createManagementPlan(planData);
      console.log("ローカル管理計画作成完了");

      // Firebaseに同期
      if (this.isEnabled()) {
        try {
          const plansRef = this.firestore.collection(
            this.getUserCollectionPath("managementPlans")
          );
          const firestoreData = this.convertToFirestore(localPlan);

          const docRef = await plansRef.add(firestoreData);
          console.log("Firebase管理計画作成完了:", docRef.id);
        } catch (firebaseError) {
          console.error("Firebase管理計画作成エラー:", firebaseError);
        }
      }

      return localPlan;
    } catch (error) {
      console.error("管理計画作成エラー:", error);
      throw error;
    }
  }

  // 管理指導記録作成（Firebase + ローカル）
  async createProgressRecord(recordData) {
    try {
      // まずローカルに作成
      const localRecord = await window.db.createProgressRecord(recordData);
      console.log("ローカル管理指導記録作成完了");

      // Firebaseに同期
      if (this.isEnabled()) {
        try {
          const recordsRef = this.firestore.collection(
            this.getUserCollectionPath("progressRecords")
          );
          const firestoreData = this.convertToFirestore(localRecord);

          const docRef = await recordsRef.add(firestoreData);
          console.log("Firebase管理指導記録作成完了:", docRef.id);
        } catch (firebaseError) {
          console.error("Firebase管理指導記録作成エラー:", firebaseError);
        }
      }

      return localRecord;
    } catch (error) {
      console.error("管理指導記録作成エラー:", error);
      throw error;
    }
  }

  // Firebaseから全データを取得
  async getAllDataFromFirebase() {
    if (!this.isEnabled()) {
      throw new Error("Firebase未有効");
    }

    try {
      console.log("Firebaseデータ取得開始");

      const collections = [
        "patients",
        "assessments",
        "generalConditions",
        "managementPlans",
        "progressRecords",
      ];
      const allData = {};

      for (const collectionName of collections) {
        const ref = this.firestore.collection(
          this.getUserCollectionPath(collectionName)
        );
        const snapshot = await ref.get();

        const data = [];
        snapshot.forEach((doc) => {
          const item = this.convertFromFirestore(doc);
          if (item) data.push(item);
        });

        allData[collectionName] = data;
        console.log(`${collectionName}: ${data.length}件取得`);
      }

      console.log("Firebaseデータ取得完了");
      return allData;
    } catch (error) {
      console.error("Firebaseデータ取得エラー:", error);
      throw error;
    }
  }

  // Firebaseからローカルにデータを復元
  async restoreFromFirebase() {
    if (!this.isEnabled()) {
      console.log("Firebase未有効 - 復元スキップ");
      return false;
    }

    try {
      console.log("Firebaseからデータ復元開始");

      // Firebaseから全データを取得
      const firebaseData = await this.getAllDataFromFirebase();

      // ローカルデータをクリア
      localStorage.removeItem(window.db.storageKey);
      window.db.init();

      // データを復元
      const localData = window.db.getData();
      localData.patients = firebaseData.patients || [];
      localData.assessments = firebaseData.assessments || [];
      localData.generalConditions = firebaseData.generalConditions || [];
      localData.managementPlans = firebaseData.managementPlans || [];
      localData.progressRecords = firebaseData.progressRecords || [];

      // 最大IDを設定
      const allItems = [
        ...localData.patients,
        ...localData.assessments,
        ...localData.generalConditions,
        ...localData.managementPlans,
        ...localData.progressRecords,
      ];

      let maxId = 0;
      allItems.forEach((item) => {
        const numericId = parseInt(item.id);
        if (!isNaN(numericId) && numericId > maxId) {
          maxId = numericId;
        }
      });

      localData.lastId = maxId;

      // データを保存
      window.db.saveData(localData);

      console.log("Firebaseからの復元完了");
      console.log("復元データ統計:", {
        patients: localData.patients.length,
        assessments: localData.assessments.length,
        generalConditions: localData.generalConditions.length,
        managementPlans: localData.managementPlans.length,
        progressRecords: localData.progressRecords.length,
      });

      return true;
    } catch (error) {
      console.error("Firebase復元エラー:", error);
      throw error;
    }
  }

  // デバッグ情報
  getDebugInfo() {
    return {
      isFirebaseEnabled: this.isFirebaseEnabled,
      currentUser: this.currentUser
        ? {
            email: this.currentUser.email,
            uid: this.currentUser.uid,
          }
        : null,
      isEnabled: this.isEnabled(),
      firestore: !!this.firestore,
    };
  }
}

// グローバルインスタンス
const firebaseDb = new FirebaseDatabase();

// ウィンドウオブジェクトに登録
window.firebaseDb = firebaseDb;

// デバッグ用
window.fbDbDebug = () => {
  console.log("FirebaseDatabase Debug Info:", firebaseDb.getDebugInfo());
};

console.log("firebase-database.js 読み込み完了");
