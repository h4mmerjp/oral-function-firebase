// 修正版データベース管理クラス
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

  generateId() {
    const data = this.getData();
    data.lastId += 1;
    this.saveData(data);
    return data.lastId;
  }

  // 患者関連
  async getPatients() {
    const data = this.getData();
    return data.patients.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }

  async getPatient(id) {
    console.log('getPatient called with ID:', id, 'type:', typeof id); // デバッグログ
    const data = this.getData();
    
    // IDの型を統一（数値として比較）
    const numericId = parseInt(id);
    const patient = data.patients.find(p => parseInt(p.id) === numericId);
    
    console.log('Found patient:', patient); // デバッグログ
    console.log('All patients:', data.patients.map(p => ({id: p.id, name: p.name}))); // デバッグログ
    
    return patient;
  }

  async createPatient(patientData) {
    const data = this.getData();
    const newPatient = {
      id: this.generateId(),
      ...patientData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    data.patients.push(newPatient);
    this.saveData(data);
    
    console.log('Created patient:', newPatient); // デバッグログ
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
        updated_at: new Date().toISOString()
      };
      this.saveData(data);
      
      console.log('Updated patient:', data.patients[index]); // デバッグログ
      return data.patients[index];
    }
    throw new Error('Patient not found');
  }

  async deletePatient(id) {
    const data = this.getData();
    const numericId = parseInt(id);
    
    data.patients = data.patients.filter(p => parseInt(p.id) !== numericId);
    data.assessments = data.assessments.filter(a => parseInt(a.patient_id) !== numericId);
    data.generalConditions = data.generalConditions.filter(g => parseInt(g.patient_id) !== numericId);
    data.managementPlans = data.managementPlans.filter(m => parseInt(m.patient_id) !== numericId);
    data.progressRecords = data.progressRecords.filter(p => parseInt(p.patient_id) !== numericId);
    
    this.saveData(data);
    console.log('Deleted patient and related data for ID:', numericId); // デバッグログ
  }

  // 検査関連（修正版）
  async getAssessments(patientId = null) {
    const data = this.getData();
    let assessments;
    
    if (patientId !== null) {
      const numericPatientId = parseInt(patientId);
      assessments = data.assessments.filter(a => parseInt(a.patient_id) === numericPatientId);
      console.log(`Assessments for patient ${numericPatientId}:`, assessments); // デバッグログ
    } else {
      assessments = data.assessments;
    }
    
    return assessments.sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date));
  }

  async getLatestAssessment(patientId) {
    console.log('getLatestAssessment called for patient:', patientId); // デバッグログ
    
    const assessments = await this.getAssessments(patientId);
    const latest = assessments.length > 0 ? assessments[0] : null;
    
    console.log('Latest assessment for patient', patientId, ':', latest); // デバッグログ
    return latest;
  }

  async createAssessment(assessmentData) {
    const data = this.getData();
    const newAssessment = {
      id: this.generateId(),
      ...assessmentData,
      created_at: new Date().toISOString()
    };
    data.assessments.push(newAssessment);
    this.saveData(data);
    
    console.log('Created assessment:', newAssessment); // デバッグログ
    return newAssessment;
  }

  // 全身状態関連（修正版）
  async getGeneralConditions(patientId) {
    const data = this.getData();
    const numericPatientId = parseInt(patientId);
    const conditions = data.generalConditions.filter(g => parseInt(g.patient_id) === numericPatientId);
    
    console.log(`General conditions for patient ${numericPatientId}:`, conditions); // デバッグログ
    return conditions.sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date));
  }

  async getLatestGeneralCondition(patientId) {
    console.log('getLatestGeneralCondition called for patient:', patientId); // デバッグログ
    
    const conditions = await this.getGeneralConditions(patientId);
    const latest = conditions.length > 0 ? conditions[0] : null;
    
    console.log('Latest general condition for patient', patientId, ':', latest); // デバッグログ
    return latest;
  }

  async createGeneralCondition(conditionData) {
    const data = this.getData();
    const newCondition = {
      id: this.generateId(),
      ...conditionData,
      created_at: new Date().toISOString()
    };
    data.generalConditions.push(newCondition);
    this.saveData(data);
    
    console.log('Created general condition:', newCondition); // デバッグログ
    return newCondition;
  }

  // 管理計画関連（修正版）
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
      created_at: new Date().toISOString()
    };
    data.managementPlans.push(newPlan);
    this.saveData(data);
    return newPlan;
  }

  // 管理指導記録関連（修正版）
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
      version: '1.0'
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

  // データの統計
  getStatistics() {
    const data = this.getData();
    const totalPatients = data.patients.length;
    const totalAssessments = data.assessments.length;
    
    // 診断済み患者数の計算を修正
    const diagnosedPatientIds = new Set();
    data.assessments.forEach(assessment => {
      if (assessment.diagnosis_result) {
        diagnosedPatientIds.add(assessment.patient_id);
      }
    });
    
    return {
      totalPatients,
      totalAssessments,
      diagnosedPatients: diagnosedPatientIds.size,
      normalPatients: totalPatients - diagnosedPatientIds.size
    };
  }

  // データベースの整合性チェック（開発用）
  checkDataIntegrity() {
    const data = this.getData();
    console.log('=== データベース整合性チェック ===');
    console.log('患者数:', data.patients.length);
    console.log('検査数:', data.assessments.length);
    console.log('全身状態記録数:', data.generalConditions.length);
    
    // 患者ごとの検査数をチェック
    data.patients.forEach(patient => {
      const patientAssessments = data.assessments.filter(a => parseInt(a.patient_id) === parseInt(patient.id));
      const patientConditions = data.generalConditions.filter(g => parseInt(g.patient_id) === parseInt(patient.id));
      
      console.log(`患者 ${patient.name} (ID: ${patient.id}):`, {
        assessments: patientAssessments.length,
        conditions: patientConditions.length
      });
    });
    
    // 孤立したデータをチェック
    const patientIds = new Set(data.patients.map(p => parseInt(p.id)));
    const orphanedAssessments = data.assessments.filter(a => !patientIds.has(parseInt(a.patient_id)));
    const orphanedConditions = data.generalConditions.filter(g => !patientIds.has(parseInt(g.patient_id)));
    
    if (orphanedAssessments.length > 0) {
      console.warn('孤立した検査データ:', orphanedAssessments);
    }
    if (orphanedConditions.length > 0) {
      console.warn('孤立した全身状態データ:', orphanedConditions);
    }
    
    console.log('=== チェック完了 ===');
  }
}

// グローバルインスタンス
const db = new OralHealthDatabase();