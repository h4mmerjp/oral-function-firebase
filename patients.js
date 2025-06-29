// 患者管理モジュール
class PatientManager {
  constructor() {
    this.currentPatient = null;
    this.selectedManagementOptions = {};
  }

  // 患者一覧の読み込み
  async loadPatients() {
    try {
      const patients = await db.getPatients();
      this.displayPatients(patients);
    } catch (error) {
      console.error('患者一覧読み込みエラー:', error);
      this.displayPatients([]);
    }
  }

  // 患者一覧を表示
  async displayPatients(patients) {
    const container = document.getElementById('patients-grid');
    
    if (!patients || patients.length === 0) {
      container.innerHTML = `
        <div class="no-patients">
          <p>登録された患者がありません。</p>
          <button onclick="patientManager.showAddPatientModal()" class="btn-success">最初の患者を登録</button>
        </div>
      `;
      return;
    }

    let html = '';
    for (const patient of patients) {
      const age = this.calculateAge(patient.birthdate);
      const latestAssessment = await db.getLatestAssessment(patient.id);
      const status = this.getPatientStatus(latestAssessment);
      
      html += `
        <div class="patient-card ${status.class}" onclick="patientManager.selectPatient(${patient.id})">
          <div class="patient-name">${patient.name}</div>
          <div class="patient-info">
            <div>ID: ${patient.patient_id}</div>
            <div>年齢: ${age}歳 (${patient.gender === 'male' ? '男性' : patient.gender === 'female' ? '女性' : '未指定'})</div>
            <div>最終検査: ${latestAssessment ? new Date(latestAssessment.assessment_date).toLocaleDateString() : '未実施'}</div>
            <div class="status-badge status-${status.class}">${status.text}</div>
          </div>
          <div style="margin-top: 10px;">
            <button onclick="event.stopPropagation(); patientManager.editPatient(${patient.id})" class="btn-secondary" style="margin: 2px; padding: 5px 10px;">編集</button>
            <button onclick="event.stopPropagation(); patientManager.deletePatient(${patient.id})" class="btn-danger" style="margin: 2px; padding: 5px 10px;">削除</button>
          </div>
        </div>
      `;
    }
    
    container.innerHTML = html;
  }

  // 年齢計算
  calculateAge(birthdate) {
    if (!birthdate) return '不明';
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  // 患者のステータスを取得
  getPatientStatus(assessment) {
    if (!assessment) {
      return { class: 'pending', text: '未診断' };
    }
    
    if (assessment.diagnosis_result) {
      return { class: 'diagnosed', text: '口腔機能低下症' };
    } else {
      return { class: 'normal', text: '正常' };
    }
  }

  // 患者検索
  searchPatients() {
    const searchTerm = document.getElementById('search-patients').value.toLowerCase();
    const cards = document.querySelectorAll('.patient-card');
    
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      if (text.includes(searchTerm)) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  }

  // 患者フィルタ
  filterPatients() {
    const filterStatus = document.getElementById('filter-status').value;
    const cards = document.querySelectorAll('.patient-card');
    
    cards.forEach(card => {
      if (!filterStatus || card.classList.contains(filterStatus)) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  }

  // 患者選択
  async selectPatient(patientId) {
    try {
      this.currentPatient = await db.getPatient(patientId);
      if (this.currentPatient) {
        this.loadPatientInfo();
        app.openTab('patient-info');
      }
    } catch (error) {
      console.error('患者選択エラー:', error);
      alert('患者情報の取得に失敗しました');
    }
  }

  // 患者情報を読み込み
  async loadPatientInfo() {
    if (!this.currentPatient) return;

    const age = this.calculateAge(this.currentPatient.birthdate);
    const content = document.getElementById('patient-info-content');
    
    content.innerHTML = `
      <div class="summary-card">
        <h3>基本情報</h3>
        <div class="grid-container">
          <div><strong>患者氏名:</strong> ${this.currentPatient.name}</div>
          <div><strong>患者ID:</strong> ${this.currentPatient.patient_id}</div>
          <div><strong>フリガナ:</strong> ${this.currentPatient.name_kana || '未入力'}</div>
          <div><strong>生年月日:</strong> ${this.currentPatient.birthdate || '未入力'}</div>
          <div><strong>年齢:</strong> ${age}歳</div>
          <div><strong>性別:</strong> ${this.currentPatient.gender === 'male' ? '男性' : this.currentPatient.gender === 'female' ? '女性' : '未指定'}</div>
          <div><strong>電話番号:</strong> ${this.currentPatient.phone || '未入力'}</div>
          <div><strong>住所:</strong> ${this.currentPatient.address || '未入力'}</div>
        </div>
        <div style="margin-top: 20px;">
          <button onclick="patientManager.editPatient(${this.currentPatient.id})" class="btn-secondary">編集</button>
          <button onclick="assessmentManager.startAssessment()" class="btn-success">検査開始</button>
          <button onclick="app.openTab('patient-history')" class="btn-secondary">履歴確認</button>
        </div>
      </div>

      <div class="summary-card">
        <h3>全身の状態</h3>
        <div id="general-conditions-form">
          <div class="grid-container">
            <div class="form-group">
              <label>基礎疾患</label>
              <div class="checkbox-container">
                <label class="checkbox-item">
                  <input type="checkbox" name="disease" value="heart"> 心疾患
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" name="disease" value="hepatitis"> 肝炎
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" name="disease" value="diabetes"> 糖尿病
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" name="disease" value="hypertension"> 高血圧症
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" name="disease" value="stroke"> 脳血管疾患
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" name="disease" value="other"> その他
                </label>
              </div>
            </div>
            
            <div class="form-group">
              <label for="medication">服用薬剤</label>
              <select id="medication-status" onchange="patientManager.toggleMedicationDetails()">
                <option value="no">なし</option>
                <option value="yes">あり</option>
              </select>
              <div id="medication-details" style="margin-top: 10px; display: none;">
                <textarea id="medication-list" placeholder="薬剤名をご記入ください"></textarea>
              </div>
            </div>
            
            <div class="form-group">
              <label for="pneumonia-history">肺炎の既往</label>
              <select id="pneumonia-history">
                <option value="no">なし</option>
                <option value="yes">あり</option>
                <option value="repeated">繰り返しあり</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="height">身長 (cm)</label>
              <input type="number" id="height" placeholder="例：165">
            </div>
            
            <div class="form-group">
              <label for="weight">体重 (kg)</label>
              <input type="number" id="weight" placeholder="例：60">
            </div>
            
            <div class="form-group">
              <label for="bmi">BMI</label>
              <div class="input-group">
                <input type="text" id="bmi" readonly>
                <div class="input-group-append">
                  <button type="button" onclick="patientManager.calculateBMI()">計算</button>
                </div>
              </div>
            </div>
          </div>
          
          <button onclick="patientManager.saveGeneralConditions()" class="btn-success">全身状態を保存</button>
        </div>
      </div>
    `;

    // 既存の全身状態データを読み込み
    await this.loadGeneralConditions();
  }

  // 服用薬剤の詳細表示切り替え
  toggleMedicationDetails() {
    const medicationStatus = document.getElementById('medication-status').value;
    const medicationDetails = document.getElementById('medication-details');
    
    if (medicationStatus === 'yes') {
      medicationDetails.style.display = 'block';
    } else {
      medicationDetails.style.display = 'none';
    }
  }

  // BMI計算
  calculateBMI() {
    const height = parseFloat(document.getElementById('height').value) / 100;
    const weight = parseFloat(document.getElementById('weight').value);
    
    if (height > 0 && weight > 0) {
      const bmi = (weight / (height * height)).toFixed(1);
      document.getElementById('bmi').value = bmi;
    } else {
      alert('身長と体重を正しく入力してください');
    }
  }

  // 全身状態の保存
  async saveGeneralConditions() {
    if (!this.currentPatient) return;

    const diseases = Array.from(document.querySelectorAll('input[name="disease"]:checked')).map(cb => cb.value);
    const medicationStatus = document.getElementById('medication-status').value;
    const medicationList = document.getElementById('medication-list').value;
    
    const generalCondition = {
      patient_id: this.currentPatient.id,
      height: parseFloat(document.getElementById('height').value) || null,
      weight: parseFloat(document.getElementById('weight').value) || null,
      bmi: parseFloat(document.getElementById('bmi').value) || null,
      diseases: JSON.stringify(diseases),
      medications: medicationStatus === 'yes' ? medicationList : '',
      pneumonia_history: document.getElementById('pneumonia-history').value,
      assessment_date: new Date().toISOString().split('T')[0]
    };

    try {
      await db.createGeneralCondition(generalCondition);
      alert('全身状態が保存されました');
    } catch (error) {
      console.error('全身状態保存エラー:', error);
      alert('保存に失敗しました');
    }
  }

  // 全身状態の読み込み
  async loadGeneralConditions() {
    if (!this.currentPatient) return;

    try {
      const condition = await db.getLatestGeneralCondition(this.currentPatient.id);
      if (condition) {
        this.fillGeneralConditionsForm(condition);
      }
    } catch (error) {
      console.error('全身状態読み込みエラー:', error);
    }
  }

  // 全身状態フォームの入力
  fillGeneralConditionsForm(condition) {
    if (condition.height) document.getElementById('height').value = condition.height;
    if (condition.weight) document.getElementById('weight').value = condition.weight;
    if (condition.bmi) document.getElementById('bmi').value = condition.bmi;
    
    if (condition.diseases) {
      const diseases = JSON.parse(condition.diseases);
      diseases.forEach(disease => {
        const checkbox = document.querySelector(`input[name="disease"][value="${disease}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }
    
    if (condition.medications) {
      document.getElementById('medication-status').value = 'yes';
      document.getElementById('medication-list').value = condition.medications;
      this.toggleMedicationDetails();
    }
    
    if (condition.pneumonia_history) {
      document.getElementById('pneumonia-history').value = condition.pneumonia_history;
    }
  }

  // モーダル関連
  showAddPatientModal() {
    document.getElementById('modal-title').textContent = '新規患者登録';
    document.getElementById('patient-form').reset();
    document.getElementById('edit-patient-id').value = '';
    document.getElementById('addPatientModal').style.display = 'block';
  }

  closeAddPatientModal() {
    document.getElementById('addPatientModal').style.display = 'none';
  }

  async editPatient(patientId) {
    try {
      const patient = await db.getPatient(patientId);
      if (patient) {
        this.fillPatientForm(patient);
        document.getElementById('modal-title').textContent = '患者情報編集';
        document.getElementById('addPatientModal').style.display = 'block';
      }
    } catch (error) {
      console.error('患者情報取得エラー:', error);
      alert('患者情報の取得に失敗しました');
    }
  }

  fillPatientForm(patient) {
    document.getElementById('edit-patient-id').value = patient.id;
    document.getElementById('modal-patient-name').value = patient.name;
    document.getElementById('modal-patient-id').value = patient.patient_id;
    document.getElementById('modal-patient-kana').value = patient.name_kana || '';
    document.getElementById('modal-birthdate').value = patient.birthdate || '';
    document.getElementById('modal-gender').value = patient.gender || '';
    document.getElementById('modal-phone').value = patient.phone || '';
    document.getElementById('modal-address').value = patient.address || '';
  }

  async deletePatient(patientId) {
    if (!confirm('本当にこの患者を削除しますか？関連するすべてのデータも削除されます。')) {
      return;
    }

    try {
      await db.deletePatient(patientId);
      alert('患者が削除されました');
      this.loadPatients();
      
      // 現在選択中の患者が削除された場合
      if (this.currentPatient && this.currentPatient.id === patientId) {
        this.currentPatient = null;
        document.getElementById('patient-info-content').innerHTML = '<p>患者一覧から患者を選択するか、新規登録を行ってください。</p>';
      }
    } catch (error) {
      console.error('患者削除エラー:', error);
      alert('削除に失敗しました');
    }
  }

  // 患者フォーム送信処理
  async handlePatientFormSubmit(event) {
    event.preventDefault();
    
    const editId = document.getElementById('edit-patient-id').value;
    const patientData = {
      name: document.getElementById('modal-patient-name').value,
      patient_id: document.getElementById('modal-patient-id').value,
      name_kana: document.getElementById('modal-patient-kana').value,
      birthdate: document.getElementById('modal-birthdate').value,
      gender: document.getElementById('modal-gender').value,
      phone: document.getElementById('modal-phone').value,
      address: document.getElementById('modal-address').value
    };

    try {
      if (editId) {
        // 更新
        await db.updatePatient(parseInt(editId), patientData);
        alert('患者情報が更新されました');
      } else {
        // 新規登録
        await db.createPatient(patientData);
        alert('患者が登録されました');
      }
      
      this.closeAddPatientModal();
      this.loadPatients();
    } catch (error) {
      console.error('患者保存エラー:', error);
      alert('保存に失敗しました: ' + error.message);
    }
  }

  // 履歴表示
  async loadPatientHistory() {
    if (!this.currentPatient) return;

    const content = document.getElementById('patient-history-content');

    try {
      const assessments = await db.getAssessments(this.currentPatient.id);
      const progressRecords = await db.getProgressRecords(this.currentPatient.id);

      this.displayPatientHistory(assessments, progressRecords);
    } catch (error) {
      console.error('履歴読み込みエラー:', error);
      content.innerHTML = '<p>履歴の読み込みに失敗しました。</p>';
    }
  }

  // 履歴表示
  displayPatientHistory(assessments, progressRecords) {
    const content = document.getElementById('patient-history-content');

    let html = `
      <div class="summary-card">
        <h3>患者情報</h3>
        <p>患者名: ${this.currentPatient.name} (ID: ${this.currentPatient.patient_id})</p>
      </div>

      <div class="summary-card">
        <h3>検査履歴</h3>
    `;

    if (assessments.length === 0) {
      html += '<p>検査履歴がありません。</p>';
    } else {
      html += `
        <table>
          <thead>
            <tr>
              <th>検査日</th>
              <th>診断結果</th>
              <th>該当項目数</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
      `;

      assessments.forEach(assessment => {
        html += `
          <tr>
            <td>${new Date(assessment.assessment_date).toLocaleDateString()}</td>
            <td>
              <span class="status-badge ${assessment.diagnosis_result ? 'status-diagnosed' : 'status-normal'}">
                ${assessment.diagnosis_result ? '口腔機能低下症' : '正常'}
              </span>
            </td>
            <td>${assessment.affected_items_count}/7項目</td>
            <td>
              <button onclick="assessmentManager.viewAssessmentDetails(${assessment.id})" class="btn-secondary" style="padding: 5px 10px;">詳細</button>
            </td>
          </tr>
        `;
      });

      html += '</tbody></table>';
    }

    html += '</div>';

    html += `
      <div class="summary-card">
        <h3>管理指導記録</h3>
    `;

    if (progressRecords.length === 0) {
      html += '<p>管理指導記録がありません。</p>';
    } else {
      html += `
        <table>
          <thead>
            <tr>
              <th>記録日</th>
              <th>全体評価</th>
              <th>所見</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
      `;

      progressRecords.forEach(record => {
        const ratings = [
          record.nutrition_rating, record.hygiene_rating, record.dryness_rating,
          record.bite_rating, record.lip_rating, record.tongue_rating,
          record.mastication_rating, record.swallowing_rating
        ].filter(r => r !== null && r !== undefined);
        
        const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 'N/A';

        html += `
          <tr>
            <td>${new Date(record.record_date).toLocaleDateString()}</td>
            <td>平均: ${avgRating}</td>
            <td>${record.findings_oral ? '所見あり' : '所見なし'}</td>
            <td>
              <button onclick="managementManager.viewProgressRecord(${record.id})" class="btn-secondary" style="padding: 5px 10px;">詳細</button>
            </td>
          </tr>
        `;
      });

      html += '</tbody></table>';
    }

    html += '</div>';

    content.innerHTML = html;
  }
}

// グローバルインスタンス
const patientManager = new PatientManager();
