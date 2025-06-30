// 最終修正版データベース管理クラス
class OralHealthDatabase {
  constructor() {
    this.storageKey = 'oralHealthApp';
    this.init();
  }

  init() {
    // ローカルストレージの初期化
    if (!localStorage.getItem(this.storageKey)) {
      const initialData = {
        patients: [],
        assessments: [],
        generalConditions: [],
        managementPlans: [],
        progressRecords: [],
        lastId: 0
      };
      localStorage.setItem(this.storageKey, JSON.stringify(initialData));
    }
  }

  getData() {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : this.getEmptyData();
  }

  getEmptyData() {
    return {
      patients: [],
      assessments: [],
      generalConditions: [],
      managementPlans: [],
      progressRecords: [],
      lastId: 0
    };
  }

  saveData(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  // 改良版ID生成 - 重複を防ぐ
  generateId() {
    const data = this.getData();
    
    // 現在の最大IDを確認
    let maxId = data.lastId || 0;
    
    // 全データから実際の最大IDを確認（安全対策）
    const allItems = [
      ...data.patients,
      ...data.assessments,
      ...data.generalConditions,
      ...data.managementPlans,
      ...data.progressRecords
    ];
    
    allItems.forEach(item => {
      if (item.id && parseInt(item.id) > maxId) {
        maxId = parseInt(item.id);
      }
    });
    
    const newId = maxId + 1;
    data.lastId = newId;
    this.saveData(data);
    
    console.log('Generated new ID:', newId);
    return newId;
  }

  // 患者関連
  async getPatients() {
    const data = this.getData();
    return data.patients.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }

  async getPatient(id) {
    console.log('getPatient called with ID:', id, 'type:', typeof id);
    const data = this.getData();
    
    // IDの型を統一（数値として比較）
    const numericId = parseInt(id);
    const patient = data.patients.find(p => parseInt(p.id) === numericId);
    
    console.log('Found patient:', patient);
    return patient;
  }

  async createPatient(patientData) {
    const data = this.getData();
    
    // 重複チェック（患者IDまたは名前+生年月日の重複）
    const existingPatient = data.patients.find(p => 
      p.patient_id === patientData.patient_id || 
      (p.name === patientData.name && p.birthdate === patientData.birthdate)
    );
    
    if (existingPatient) {
      console.warn('重複する患者が見つかりました:', existingPatient);
      throw new Error('同じ患者IDまたは患者情報が既に存在します');
    }
    
    const newPatient = {
      id: this.generateId(),
      ...patientData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    data.patients.push(newPatient);
    this.saveData(data);
    
    console.log('Created new patient:', newPatient);
    return newPatient;
  }

  async updatePatient(id, patientData) {
    const data = this.getData();
    const numericId = parseInt(id);
    const index = data.patients.findIndex(p => parseInt(p.id) === numericId);
    
    if (index !== -1) {
      data.patients[index] = {
        ...data.patients[index],
        ...patientData,
        id: numericId, // IDは変更しない
        updated_at: new Date().toISOString()
      };
      this.saveData(data);
      
      console.log('Updated patient:', data.patients[index]);
      return data.patients[index];
    }
    throw new Error('Patient not found');
  }

  async deletePatient(id) {
    const data = this.getData();
    const numericId = parseInt(id);
    
    // 削除前のチェック
    const patientExists = data.patients.some(p => parseInt(p.id) === numericId);
    if (!patientExists) {
      console.warn('削除対象の患者が見つかりません:', numericId);
      return;
    }
    
    // 関連データも削除
    data.patients = data.patients.filter(p => parseInt(p.id) !== numericId);
    data.assessments = data.assessments.filter(a => parseInt(a.patient_id) !== numericId);
    data.generalConditions = data.generalConditions.filter(g => parseInt(g.patient_id) !== numericId);
    data.managementPlans = data.managementPlans.filter(m => parseInt(m.patient_id) !== numericId);
    data.progressRecords = data.progressRecords.filter(p => parseInt(p.patient_id) !== numericId);
    
    this.saveData(data);
    console.log('Deleted patient and related data for ID:', numericId);
  }

  // 検査関連
  async getAssessments(patientId = null) {
    const data = this.getData();
    let assessments;
    
    if (patientId !== null) {
      const numericPatientId = parseInt(patientId);
      assessments = data.assessments.filter(a => parseInt(a.patient_id) === numericPatientId);
      console.log(`Assessments for patient ${numericPatientId}:`, assessments);
    } else {
      assessments = data.assessments;
    }
    
    return assessments.sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date));
  }

  async getLatestAssessment(patientId) {
    console.log('getLatestAssessment called for patient:', patientId);
    
    const assessments = await this.getAssessments(patientId);
    const latest = assessments.length > 0 ? assessments[0] : null;
    
    console.log('Latest assessment for patient', patientId, ':', latest);
    return latest;
  }

  async createAssessment(assessmentData) {
    const data = this.getData();
    
    // 患者の存在確認
    const patientExists = data.patients.some(p => parseInt(p.id) === parseInt(assessmentData.patient_id));
    if (!patientExists) {
      throw new Error('指定された患者が存在しません');
    }
    
    const newAssessment = {
      id: this.generateId(),
      ...assessmentData,
      patient_id: parseInt(assessmentData.patient_id), // 数値型で保存
      created_at: new Date().toISOString()
    };
    
    data.assessments.push(newAssessment);
    this.saveData(data);
    
    console.log('Created assessment:', newAssessment);
    return newAssessment;
  }

  // 全身状態関連
  async getGeneralConditions(patientId) {
    const data = this.getData();
    const numericPatientId = parseInt(patientId);
    const conditions = data.generalConditions.filter(g => parseInt(g.patient_id) === numericPatientId);
    
    console.log(`General conditions for patient ${numericPatientId}:`, conditions);
    return conditions.sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date));
  }

  async getLatestGeneralCondition(patientId) {
    console.log('getLatestGeneralCondition called for patient:', patientId);
    
    const conditions = await this.getGeneralConditions(patientId);
    const latest = conditions.length > 0 ? conditions[0] : null;
    
    console.log('Latest general condition for patient', patientId, ':', latest);
    return latest;
  }

  async createGeneralCondition(conditionData) {
    const data = this.getData();
    
    // 患者の存在確認
    const patientExists = data.patients.some(p => parseInt(p.id) === parseInt(conditionData.patient_id));
    if (!patientExists) {
      throw new Error('指定された患者が存在しません');
    }
    
    const newCondition = {
      id: this.generateId(),
      ...conditionData,
      patient_id: parseInt(conditionData.patient_id), // 数値型で保存
      created_at: new Date().toISOString()
    };
    
    data.generalConditions.push(newCondition);
    this.saveData(data);
    
    console.log('Created general condition:', newCondition);
    return newCondition;
  }

  // 管理計画関連
  async getManagementPlans(patientId) {
    const data = this.getData();
    const numericPatientId = parseInt(patientId);
    const plans = data.managementPlans.filter(m => parseInt(m.patient_id) === numericPatientId);
    return plans.sort((a, b) => new Date(b.plan_date) - new Date(a.plan_date));
  }

  async createManagementPlan(planData) {
    const data = this.getData();
    const newPlan = {
      id: this.generateId(),
      ...planData,
      patient_id: parseInt(planData.patient_id),
      created_at: new Date().toISOString()
    };
    data.managementPlans.push(newPlan);
    this.saveData(data);
    return newPlan;
  }

  // 管理指導記録関連
  async getProgressRecords(patientId) {
    const data = this.getData();
    const numericPatientId = parseInt(patientId);
    const records = data.progressRecords.filter(r => parseInt(r.patient_id) === numericPatientId);
    return records.sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
  }

  async createProgressRecord(recordData) {
    const data = this.getData();
    const newRecord = {
      id: this.generateId(),
      ...recordData,
      patient_id: parseInt(recordData.patient_id),
      created_at: new Date().toISOString()
    };
    data.progressRecords.push(newRecord);
    this.saveData(data);
    return newRecord;
  }

  // データのエクスポート/インポート
  exportData() {
    const data = this.getData();
    const exportData = {
      ...data,
      exportDate: new Date().toISOString(),
      version: '1.1'
    };
    return JSON.stringify(exportData, null, 2);
  }

  importData(jsonData) {
    try {
      const importedData = JSON.parse(jsonData);
      
      // バックアップを作成
      const currentData = this.getData();
      localStorage.setItem(this.storageKey + '_backup', JSON.stringify(currentData));
      
      // インポートデータの検証
      if (!importedData.patients || !Array.isArray(importedData.patients)) {
        throw new Error('無効なデータ形式です');
      }
      
      // IDの整合性をチェック・修正
      this.validateAndFixImportedData(importedData);
      
      // データをインポート
      this.saveData({
        patients: importedData.patients || [],
        assessments: importedData.assessments || [],
        generalConditions: importedData.generalConditions || [],
        managementPlans: importedData.managementPlans || [],
        progressRecords: importedData.progressRecords || [],
        lastId: importedData.lastId || 0
      });
      
      return true;
    } catch (error) {
      console.error('インポートエラー:', error);
      throw new Error('データのインポートに失敗しました: ' + error.message);
    }
  }

  // インポートデータの検証と修正
  validateAndFixImportedData(data) {
    let maxId = 0;
    
    // 最大IDを確認
    const allItems = [
      ...data.patients,
      ...data.assessments,
      ...data.generalConditions,
      ...data.managementPlans,
      ...data.progressRecords
    ];
    
    allItems.forEach(item => {
      if (item.id && parseInt(item.id) > maxId) {
        maxId = parseInt(item.id);
      }
    });
    
    data.lastId = maxId;
    
    // patient_idの数値化
    ['assessments', 'generalConditions', 'managementPlans', 'progressRecords'].forEach(key => {
      if (data[key]) {
        data[key].forEach(item => {
          if (item.patient_id) {
            item.patient_id = parseInt(item.patient_id);
          }
        });
      }
    });
  }

  // データの統計
  getStatistics() {
    const data = this.getData();
    const totalPatients = data.patients.length;
    const totalAssessments = data.assessments.length;
    
    // 診断済み患者数の計算
    const diagnosedPatientIds = new Set();
    data.assessments.forEach(assessment => {
      if (assessment.diagnosis_result) {
        diagnosedPatientIds.add(parseInt(assessment.patient_id));
      }
    });
    
    return {
      totalPatients,
      totalAssessments,
      diagnosedPatients: diagnosedPatientIds.size,
      normalPatients: totalPatients - diagnosedPatientIds.size
    };
  }
}

// グローバルインスタンス
const db = new OralHealthDatabase();