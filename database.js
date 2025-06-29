// データベース管理クラス
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
    const data = this.getData();
    return data.patients.find(p => p.id === id);
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
    return newPatient;
  }

  async updatePatient(id, patientData) {
    const data = this.getData();
    const index = data.patients.findIndex(p => p.id === id);
    if (index !== -1) {
      data.patients[index] = {
        ...data.patients[index],
        ...patientData,
        updated_at: new Date().toISOString()
      };
      this.saveData(data);
      return data.patients[index];
    }
    throw new Error('Patient not found');
  }

  async deletePatient(id) {
    const data = this.getData();
    data.patients = data.patients.filter(p => p.id !== id);
    data.assessments = data.assessments.filter(a => a.patient_id !== id);
    data.generalConditions = data.generalConditions.filter(g => g.patient_id !== id);
    data.managementPlans = data.managementPlans.filter(m => m.patient_id !== id);
    data.progressRecords = data.progressRecords.filter(p => p.patient_id !== id);
    this.saveData(data);
  }

  // 検査関連
  async getAssessments(patientId = null) {
    const data = this.getData();
    const assessments = patientId 
      ? data.assessments.filter(a => a.patient_id === patientId)
      : data.assessments;
    return assessments.sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date));
  }

  async getLatestAssessment(patientId) {
    const assessments = await this.getAssessments(patientId);
    return assessments.length > 0 ? assessments[0] : null;
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
    return newAssessment;
  }

  // 全身状態関連
  async getGeneralConditions(patientId) {
    const data = this.getData();
    const conditions = data.generalConditions.filter(g => g.patient_id === patientId);
    return conditions.sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date));
  }

  async getLatestGeneralCondition(patientId) {
    const conditions = await this.getGeneralConditions(patientId);
    return conditions.length > 0 ? conditions[0] : null;
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
    return newCondition;
  }

  // 管理計画関連
  async getManagementPlans(patientId) {
    const data = this.getData();
    const plans = data.managementPlans.filter(m => m.patient_id === patientId);
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

  // 管理指導記録関連
  async getProgressRecords(patientId) {
    const data = this.getData();
    const records = data.progressRecords.filter(r => r.patient_id === patientId);
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
    const diagnosedPatients = data.assessments.filter(a => a.diagnosis_result).length;
    
    return {
      totalPatients,
      totalAssessments,
      diagnosedPatients,
      normalPatients: totalPatients - diagnosedPatients
    };
  }
}

// グローバルインスタンス
const db = new OralHealthDatabase();
