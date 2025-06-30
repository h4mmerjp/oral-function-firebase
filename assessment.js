// 診断結果の表示（修正版）
  loadDiagnosisContent() {
    if (!this.currentAssessment) return;

    const content = document.getElementById('diagnosis-content');
    const completedItems = this.currentAssessment.affected_items_count;
    const diagnosis = this.currentAssessment.diagnosis_result;

    let html = `
      <div class="summary-card">
        <h3>患者情報</h3>
        <p>患者名: ${patientManager.currentPatient.name} (ID: ${patientManager.currentPatient.patient_id})</p>
        <p>検査日: ${this.currentAssessment.assessment_date}</p>
      </div>

      <div class="summary-card">
        <div class="result-box ${diagnosis ? 'result-positive' : 'result-negative'}">
          <h3>診断結果: ${diagnosis ? '口腔機能低下症' : '口腔機能低下症ではありません'}</h3>
          <p>7項目中${completedItems}項目が基準値を下回っています${diagnosis ? '' : '（3項目未満）'}。</p>
        </div>
      </div>

      <div class="summary-card">
        <h3>評価項目の詳細</h3>
        <table>
          <thead>
            <tr>
              <th>評価項目</th>
              <th>検査値</th>
              <th>基準値</th>
              <th>判定</th>
            </tr>
          </thead>
          <tbody>
    `;

    // 各項目の詳細を追加
    if (this.currentAssessment.tci_value !== undefined) {
      html += `
        <tr>
          <td>① 口腔衛生状態不良</td>
          <td>TCI値: ${this.currentAssessment.tci_value}%</td>
          <td>50%以上</td>
          <td>${this.currentAssessment.tci_status ? '<span class="red-text">該当</span>' : '<span class="green-text">非該当</span>'}</td>
        </tr>
      `;
    }

    if (this.currentAssessment.moisture_value !== undefined || this.currentAssessment.saliva_value !== undefined) {
      let value = '';
      if (this.currentAssessment.moisture_value !== undefined) {
        value = `湿潤度: ${this.currentAssessment.moisture_value}`;
      } else if (this.currentAssessment.saliva_value !== undefined) {
        value = `唾液量: ${this.currentAssessment.saliva_value}g/2分`;
      }
      
      html += `
        <tr>
          <td>② 口腔乾燥</td>
          <td>${value}</td>
          <td>湿潤度27.0未満または唾液量2g/2分以下</td>
          <td>${this.currentAssessment.dryness_status ? '<span class="red-text">該当</span>' : '<span class="green-text">非該当</span>'}</td>
        </tr>
      `;
    }

    if (this.currentAssessment.bite_force_value !== undefined || this.currentAssessment.teeth_count !== undefined) {
      let value = '';
      if (this.currentAssessment.bite_force_value !== undefined) {
        value = `咬合力: ${this.currentAssessment.bite_force_value}N`;
      } else if (this.currentAssessment.teeth_count !== undefined) {
        value = `残存歯数: ${this.currentAssessment.teeth_count}本`;
      }
      
      html += `
        <tr>
          <td>③ 咬合力低下</td>
          <td>${value}</td>
          <td>咬合力350N未満または残存歯数20本未満</td>
          <td>${this.currentAssessment.bite_force_status ? '<span class="red-text">該当</span>' : '<span class="green-text">非該当</span>'}</td>
        </tr>
      `;
    }

    if (this.currentAssessment.pa_value !== undefined && this.currentAssessment.ta_value !== undefined && this.currentAssessment.ka_value !== undefined) {
      html += `
        <tr>
          <td>④ 舌口唇運動機能低下</td>
          <td>パ: ${this.currentAssessment.pa_value}回/秒, タ: ${this.currentAssessment.ta_value}回/秒, カ: ${this.currentAssessment.ka_value}回/秒</td>
          <td>いずれかが6回/秒未満</td>
          <td>${this.currentAssessment.oral_diadochokinesis_status ? '<span class="red-text">該当</span>' : '<span class="green-text">非該当</span>'}</td>
        </tr>
      `;
    }

    if (this.currentAssessment.tongue_pressure_value !== undefined) {
      html += `
        <tr>
          <td>⑤ 低舌圧</td>
          <td>${this.currentAssessment.tongue_pressure_value}kPa</td>
          <td>30kPa未満</td>
          <td>${this.currentAssessment.tongue_pressure_status ? '<span class="red-text">該当</span>' : '<span class="green-text">非該当</span>'}</td>
        </tr>
      `;
    }

    if (this.currentAssessment.glucose_value !== undefined || this.currentAssessment.mastication_score !== undefined) {
      let value = '';
      if (this.currentAssessment.glucose_value !== undefined) {
        value = `グルコース濃度: ${this.currentAssessment.glucose_value}mg/dL`;
      } else if (this.currentAssessment.mastication_score !== undefined) {
        value = `咀嚼能率スコア: ${this.currentAssessment.mastication_score}`;
      }
      
      html += `
        <tr>
          <td>⑥ 咀嚼機能低下</td>
          <td>${value}</td>
          <td>グルコース濃度100mg/dL未満またはスコア2以下</td>
          <td>${this.currentAssessment.mastication_status ? '<span class="red-text">該当</span>' : '<span class="green-text">非該当</span>'}</td>
        </tr>
      `;
    }

    if (this.currentAssessment.eat10_score !== undefined) {
      html += `
        <tr>
          <td>⑦ 嚥下機能低下</td>
          <td>EAT-10スコア: ${this.currentAssessment.eat10_score}点</td>
          <td>3点以上</td>
          <td>${this.currentAssessment.swallowing_status ? '<span class="red-text">該当</span>' : '<span class="green-text">非該当</span>'}</td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>
      </div>

      <div style="margin-top: 30px;">
        <button onclick="createManagementPlanSafe()" class="btn-success">管理計画書作成</button>
        <button onclick="openPatientHistorySafe()" class="btn-secondary">履歴確認</button>
      </div>
    `;

    content.innerHTML = html;
  }