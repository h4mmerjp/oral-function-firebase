// 患者管理モジュール（最小修正版 - 既存機能との完全互換性維持）
class PatientManager {
  constructor() {
    this.currentPatient = null;
    this.selectedManagementOptions = {};
  }

  // データベース接続確認（安全版）
  isDatabaseReady() {
    // window.dbの存在確認
    if (!window.db) {
      return false;
    }

    // isConnected メソッドの存在と実行
    if (typeof window.db.isConnected === "function") {
      try {
        return window.db.isConnected();
      } catch (error) {
        return false;
      }
    }

    // Firebase版の場合の追加チェック
    if (window.db.isOnline !== undefined) {
      return window.db.isOnline && window.db.currentUser;
    }

    // 従来版の場合、基本的な存在確認のみ
    return true;
  }

  // データベース準備完了を待つ（安全版）
  async waitForDatabaseReady() {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (this.isDatabaseReady()) {
          resolve(true);
        } else {
          setTimeout(checkReady, 200);
        }
      };
      checkReady();
    });
  }

  // 患者数制限チェック（Firebase専用）
  async checkPatientLimit() {
    try {
      if (window.firebaseManager && window.firebaseManager.isAvailable()) {
        const limitInfo = await window.firebaseManager.checkPatientLimit();
        console.log("Firebase制限チェック結果:", limitInfo);
        return limitInfo;
      } else {
        return {
          allowed: false,
          isOffline: true,
          message: "ログインが必要です",
        };
      }
    } catch (error) {
      console.error("患者数制限チェックエラー:", error);
      return {
        allowed: false,
        isOffline: true,
        message: "エラー発生: " + error.message,
      };
    }
  }

  // 制限到達時のアップグレード促進
  showUpgradePrompt(limitInfo) {
    if (limitInfo.isOffline) {
      this.handleOfflineError();
      return false;
    }

    const upgradeModal = this.createUpgradeModal(limitInfo);
    document.body.appendChild(upgradeModal);
    upgradeModal.style.display = "block";
    return true;
  }

  // オフライン時のエラーハンドリング
  handleOfflineError() {
    alert(
      "データの保存・読み込みにはログインが必要です。\n\n機能:\n- 患者データの保存\n- 検査結果の記録\n- 管理計画の作成\n\n画面右上の「Googleでログイン」ボタンからログインしてください。"
    );
  }

  // アップグレードモーダルの作成
  createUpgradeModal(limitInfo) {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "upgrade-modal";

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <h2 style="color: #e74c3c; text-align: center;">患者数上限に達しました</h2>
        
        <div style="text-align: center; margin: 20px 0;">
          <div style="font-size: 24px; font-weight: bold; color: #e74c3c;">
            ${limitInfo.current} / ${limitInfo.limit}人
          </div>
          <p>現在のプラン（${
            limitInfo.plan === "free" ? "無料プラン" : "プレミアムプラン"
          }）の上限に達しています</p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-top: 0;">プレミアムプランの特典</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>患者数無制限</li>
            <li>自動データバックアップ</li>
            <li>優先サポート</li>
            <li>高度な統計機能</li>
            <li>データエクスポート機能</li>
          </ul>
          <div style="text-align: center; margin-top: 15px;">
            <span style="font-size: 18px; font-weight: bold; color: #e74c3c;">月額 2,980円</span>
            <span style="color: #666; margin-left: 10px;">（年額プラン: 29,800円で2ヶ月分お得）</span>
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <button onclick="window.patientManager.closeUpgradeModal()" class="btn-secondary">後で</button>
          <button onclick="window.patientManager.startUpgradeProcess()" class="btn-success" style="margin-left: 10px;">プレミアムにアップグレード</button>
        </div>

        <div style="text-align: center; margin-top: 15px;">
          <small style="color: #666;">
            既存のデータはそのまま保持されます。いつでもキャンセル可能です。
          </small>
        </div>
      </div>
    `;

    return modal;
  }

  closeUpgradeModal() {
    const modal = document.getElementById("upgrade-modal");
    if (modal) {
      modal.remove();
    }
  }

  startUpgradeProcess() {
    alert(
      "アップグレード機能は次のフェーズで実装予定です。\n現在はデモ版のため、この機能は利用できません。"
    );
    this.closeUpgradeModal();
  }

  // 通知表示機能
  showNotification(message, type = "info") {
    const existingNotification = document.getElementById(
      "patient-notification"
    );
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement("div");
    notification.id = "patient-notification";
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${
        type === "warning"
          ? "#f39c12"
          : type === "error"
          ? "#e74c3c"
          : type === "success"
          ? "#2ecc71"
          : "#3498db"
      };
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      max-width: 350px;
      font-size: 14px;
      line-height: 1.4;
    `;

    // セキュリティ対策: HTMLエスケープを行い、textContentを使用
    const messageContainer = document.createElement('div');
    messageContainer.style.cssText = 'display: flex; align-items: flex-start; gap: 10px;';
    
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = 'flex: 1;';
    messageDiv.textContent = message; // XSS対策: textContentを使用
    
    const closeButton = document.createElement('button');
    closeButton.style.cssText = 'background: none; border: none; color: white; cursor: pointer; font-size: 18px; padding: 0;';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => {
      notification.remove();
    });
    
    messageContainer.appendChild(messageDiv);
    messageContainer.appendChild(closeButton);
    notification.appendChild(messageContainer);

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  // 患者一覧の読み込み（最小修正版）
  async loadPatients() {
    try {
      console.log("患者一覧読み込み開始");

      // データベース準備完了を待つ（安全版）
      await this.waitForDatabaseReady();

      console.log("データベース準備完了 - 患者データ取得開始");
      const patients = await window.db.getPatients();
      console.log("取得した患者数:", patients.length);

      this.displayPatients(patients);
      await this.updatePatientCountDisplay(patients.length);
    } catch (error) {
      console.error("患者一覧読み込みエラー:", error);

      if (error.message.includes("ログイン")) {
        console.log("ログインエラーのため、オフライン表示に切り替え");
        this.displayOfflineMessage();
      } else {
        console.log("その他のエラーのため、空の患者一覧を表示");
        this.displayPatients([]);
        this.showNotification("患者一覧の読み込みに失敗しました", "error");
      }
    }
  }

  // オフライン時のメッセージ表示
  displayOfflineMessage() {
    const container = document.getElementById("patients-grid");
    if (!container) {
      console.error("patients-grid要素が見つかりません");
      return;
    }

    container.innerHTML = `
      <div class="no-patients">
        <h3 style="color: #e74c3c;">ログインが必要です</h3>
        <p>患者データの保存・読み込みにはGoogleアカウントでのログインが必要です。</p>
        <p style="color: #666; font-size: 14px;">
          • データはクラウドに安全に保存されます<br>
          • どのデバイスからでもアクセス可能<br>
          • 自動バックアップで安心
        </p>
        <button onclick="window.firebaseManager && window.firebaseManager.signInWithGoogle()" class="btn-success">Googleでログイン</button>
      </div>
    `;
  }

  // 患者数表示の更新（Firebase版）
  async updatePatientCountDisplay(currentCount) {
    try {
      if (window.firebaseManager && window.firebaseManager.isAvailable()) {
        console.log("Firebase利用中 - 患者数を更新:", currentCount);

        await window.firebaseManager.updatePatientCount(currentCount);
        const limitInfo = await this.checkPatientLimit();
        this.displayPatientCountInfo(limitInfo);
      }
    } catch (error) {
      console.error("患者数表示更新エラー:", error);
    }
  }

  // 患者数情報の表示
  displayPatientCountInfo(limitInfo) {
    if (limitInfo.isOffline) {
      return;
    }

    const searchContainer = document.querySelector(".search-container");
    if (!searchContainer) return;

    const existingInfo = document.getElementById("patient-limit-info");
    if (existingInfo) {
      existingInfo.remove();
    }

    const limitInfoElement = document.createElement("div");
    limitInfoElement.id = "patient-limit-info";
    limitInfoElement.style.cssText = `
      background: ${
        limitInfo.current >= limitInfo.limit
          ? "#fdedec"
          : limitInfo.current >= limitInfo.limit * 0.8
          ? "#fef9e7"
          : "#eafaf1"
      };
      border: 1px solid ${
        limitInfo.current >= limitInfo.limit
          ? "#e74c3c"
          : limitInfo.current >= limitInfo.limit * 0.8
          ? "#f39c12"
          : "#2ecc71"
      };
      color: ${
        limitInfo.current >= limitInfo.limit
          ? "#e74c3c"
          : limitInfo.current >= limitInfo.limit * 0.8
          ? "#f39c12"
          : "#2ecc71"
      };
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 10px;
      font-size: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const remaining = limitInfo.limit - limitInfo.current;
    const planText =
      limitInfo.plan === "free" ? "無料プラン" : "プレミアムプラン";

    limitInfoElement.innerHTML = `
      <div>
        <strong>${planText}</strong>: ${limitInfo.current} / ${
      limitInfo.limit
    }人
        ${remaining > 0 ? `（残り ${remaining}人）` : "（上限到達）"}
      </div>
      ${
        limitInfo.plan === "free" && limitInfo.current >= limitInfo.limit * 0.8
          ? '<button onclick="window.patientManager.showUpgradeInfo()" class="btn-warning" style="padding: 5px 10px; font-size: 12px;">アップグレード</button>'
          : ""
      }
    `;

    searchContainer.insertBefore(limitInfoElement, searchContainer.firstChild);
  }

  showUpgradeInfo() {
    this.showUpgradePrompt({
      current: 4,
      limit: 5,
      plan: "free",
      isOffline: false,
    });
  }

  // 患者一覧を表示（修正版 - エラーハンドリング強化）
  async displayPatients(patients) {
    const container = document.getElementById("patients-grid");
    if (!container) {
      console.error("patients-grid要素が見つかりません");
      return;
    }

    if (!patients || patients.length === 0) {
      if (
        !window.firebaseManager ||
        !window.firebaseManager.isAvailable() ||
        !window.firebaseManager.getCurrentUser()
      ) {
        this.displayOfflineMessage();
        return;
      }

      container.innerHTML = `
        <div class="no-patients">
          <p>登録された患者がありません。</p>
          <button onclick="window.patientManager.showAddPatientModal()" class="btn-success">最初の患者を登録</button>
        </div>
      `;
      return;
    }

    let html = "";
    for (const patient of patients) {
      const age = this.calculateAge(patient.birthdate);

      let latestAssessment = null;
      try {
        if (this.isDatabaseReady()) {
          latestAssessment = await window.db.getLatestAssessment(patient.id);
        }
      } catch (error) {
        console.warn("最新検査取得エラー:", error);
      }

      const status = this.getPatientStatus(latestAssessment);

      // HTMLエスケープ処理
      const escapedName = window.securityUtils ? window.securityUtils.escapeHtml(patient.name) : patient.name;
      const escapedPatientId = window.securityUtils ? window.securityUtils.escapeHtml(patient.patient_id) : patient.patient_id;
      const escapedId = window.securityUtils ? window.securityUtils.escapeHtml(patient.id) : patient.id;

      html += `
        <div class="patient-card ${
          status.class
        }" onclick="window.patientManager.selectPatient('${escapedId}')" data-patient-id="${escapedId}">
          <div class="patient-name">${escapedName}</div>
          <div class="patient-info">
            <div>ID: ${escapedPatientId}</div>
            <div>年齢: ${age}歳 (${
        patient.gender === "male"
          ? "男性"
          : patient.gender === "female"
          ? "女性"
          : "未指定"
      })</div>
            <div>最終検査: ${
              latestAssessment
                ? new Date(
                    latestAssessment.assessment_date
                  ).toLocaleDateString()
                : "未実施"
            }</div>
            <div class="status-badge status-${status.class}">${
        status.text
      }</div>
          </div>
          <div style="margin-top: 10px;">
            <button onclick="event.stopPropagation(); window.patientManager.editPatient('${escapedId}')" class="btn-secondary" style="margin: 2px; padding: 5px 10px;">編集</button>
            <button onclick="event.stopPropagation(); window.patientManager.deletePatient('${escapedId}')" class="btn-danger" style="margin: 2px; padding: 5px 10px;">削除</button>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  calculateAge(birthdate) {
    if (!birthdate) return "不明";
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  }

  getPatientStatus(assessment) {
    if (!assessment) {
      return { class: "pending", text: "未診断" };
    }

    if (assessment.diagnosis_result) {
      return { class: "diagnosed", text: "口腔機能低下症" };
    } else {
      return { class: "normal", text: "正常" };
    }
  }

  searchPatients() {
    const searchInput = document.getElementById("search-patients");
    if (!searchInput) return;

    const searchTerm = searchInput.value.toLowerCase();
    const cards = document.querySelectorAll(".patient-card");

    cards.forEach((card) => {
      const text = card.textContent.toLowerCase();
      if (text.includes(searchTerm)) {
        card.style.display = "block";
      } else {
        card.style.display = "none";
      }
    });
  }

  filterPatients() {
    const filterSelect = document.getElementById("filter-status");
    if (!filterSelect) return;

    const filterStatus = filterSelect.value;
    const cards = document.querySelectorAll(".patient-card");

    cards.forEach((card) => {
      if (!filterStatus || card.classList.contains(filterStatus)) {
        card.style.display = "block";
      } else {
        card.style.display = "none";
      }
    });
  }

  // 患者選択（最小修正版）
  async selectPatient(patientId) {
    try {
      console.log("=== 患者選択開始 ===");
      console.log("選択された患者ID:", patientId);

      // データベース準備完了を待つ
      await this.waitForDatabaseReady();

      this.clearAllPatientData();

      const selectedPatient = await window.db.getPatient(patientId);
      console.log("取得した患者:", selectedPatient);

      if (!selectedPatient) {
        console.error("患者が見つかりません:", patientId);
        this.showNotification("患者情報の取得に失敗しました", "error");
        return;
      }

      this.currentPatient = selectedPatient;
      console.log("設定された現在の患者:", this.currentPatient);

      await this.loadPatientInfo();

      if (window.app && typeof window.app.openTab === "function") {
        window.app.openTab("patient-info");
      } else {
        this.directTabSwitch("patient-info");
      }

      console.log("=== 患者選択完了 ===");
    } catch (error) {
      console.error("患者選択エラー:", error);
      this.showNotification(
        "患者情報の取得に失敗しました: " + error.message,
        "error"
      );
    }
  }

  directTabSwitch(tabName) {
    try {
      console.log("直接タブ切り替えを実行:", tabName);

      const tabContents = document.querySelectorAll(".tab-content");
      tabContents.forEach((content) => {
        content.classList.remove("active");
      });

      const tabs = document.querySelectorAll(".tab");
      tabs.forEach((tab) => {
        tab.classList.remove("active");
      });

      const targetTab = document.getElementById(tabName);
      if (targetTab) {
        targetTab.classList.add("active");
        console.log("タブ表示完了:", tabName);
      } else {
        console.error("対象タブが見つかりません:", tabName);
      }

      const tabButton = document.querySelector(`.tab[onclick*="${tabName}"]`);
      if (tabButton) {
        tabButton.classList.add("active");
        console.log("タブボタンアクティブ化完了");
      }
    } catch (error) {
      console.error("直接タブ切り替えエラー:", error);
    }
  }

  clearAllPatientData() {
    console.log("すべての患者データをクリア中...");

    this.currentPatient = null;

    if (window.assessmentManager) {
      window.assessmentManager.currentAssessment = null;
      window.assessmentManager.assessmentStatus = {
        tci: false,
        dryness: false,
        biteForce: false,
        oralDiadochokinesis: false,
        tonguePressure: false,
        mastication: false,
        swallowing: false,
      };
      window.assessmentManager.eat10Scores = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      window.assessmentManager.seiryoScores = [
        "C",
        "C",
        "C",
        "C",
        "C",
        "C",
        "C",
        "C",
        "C",
        "C",
        "C",
        "C",
        "C",
        "C",
        "C",
      ];
      console.log("検査データクリア完了");
    } else {
      console.warn("assessmentManager が見つかりません");
    }

    if (window.managementManager) {
      window.managementManager.selectedManagementOptions = {};
      console.log("管理計画データクリア完了");
    } else {
      console.warn("managementManager が見つかりません");
    }

    const contentElements = [
      "patient-info-content",
      "assessment-content",
      "diagnosis-content",
      "management-plan-content",
      "progress-record-content",
      "patient-history-content",
    ];

    contentElements.forEach((elementId) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.innerHTML = "<p>患者を選択してください。</p>";
      }
    });

    console.log("データクリア完了");
  }

  // 患者情報を読み込み（最小修正版）
  async loadPatientInfo() {
    if (!this.currentPatient) {
      console.error("currentPatient が設定されていません");
      const contentElement = document.getElementById("patient-info-content");
      if (contentElement) {
        contentElement.innerHTML = "<p>患者を選択してください。</p>";
      }
      return;
    }

    console.log("患者情報読み込み開始:", this.currentPatient);

    const age = this.calculateAge(this.currentPatient.birthdate);
    const content = document.getElementById("patient-info-content");

    if (!content) {
      console.error("patient-info-content 要素が見つかりません");
      return;
    }

    const patientInfoHTML = `
      <div class="summary-card">
        <h3>基本情報</h3>
        <p style="background: #e3f2fd; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
          <strong>選択中の患者:</strong> ${this.currentPatient.name} (ID: ${
      this.currentPatient.id
    })
        </p>
        <div class="grid-container">
          <div><strong>患者氏名:</strong> ${this.currentPatient.name}</div>
          <div><strong>患者ID:</strong> ${this.currentPatient.patient_id}</div>
          <div><strong>フリガナ:</strong> ${
            this.currentPatient.name_kana || "未入力"
          }</div>
          <div><strong>生年月日:</strong> ${
            this.currentPatient.birthdate || "未入力"
          }</div>
          <div><strong>年齢:</strong> ${age}歳</div>
          <div><strong>性別:</strong> ${
            this.currentPatient.gender === "male"
              ? "男性"
              : this.currentPatient.gender === "female"
              ? "女性"
              : "未指定"
          }</div>
          <div><strong>電話番号:</strong> ${
            this.currentPatient.phone || "未入力"
          }</div>
          <div><strong>住所:</strong> ${
            this.currentPatient.address || "未入力"
          }</div>
        </div>
        <div style="margin-top: 20px;">
          <button onclick="window.patientManager.editPatient('${
            this.currentPatient.id
          }')" class="btn-secondary">編集</button>
          <button onclick="window.startAssessment && window.startAssessment()" class="btn-success">検査開始</button>
          <button onclick="window.patientManager.openPatientHistory()" class="btn-secondary">履歴確認</button>
        </div>
      </div>

      <div class="summary-card">
        <h3>全身の状態</h3>
        <div id="general-conditions-form-${this.currentPatient.id}">
          <div class="grid-container">
            <div class="form-group">
              <label>基礎疾患</label>
              <div class="checkbox-container">
                <label class="checkbox-item">
                  <input type="checkbox" name="disease-${
                    this.currentPatient.id
                  }" value="heart"> 心疾患
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" name="disease-${
                    this.currentPatient.id
                  }" value="hepatitis"> 肝炎
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" name="disease-${
                    this.currentPatient.id
                  }" value="diabetes"> 糖尿病
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" name="disease-${
                    this.currentPatient.id
                  }" value="hypertension"> 高血圧症
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" name="disease-${
                    this.currentPatient.id
                  }" value="stroke"> 脳血管疾患
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" name="disease-${
                    this.currentPatient.id
                  }" value="other"> その他
                </label>
              </div>
            </div>
            
            <div class="form-group">
              <label for="medication-status-${
                this.currentPatient.id
              }">服用薬剤</label>
              <select id="medication-status-${
                this.currentPatient.id
              }" onchange="window.patientManager.toggleMedicationDetails()">
                <option value="no">なし</option>
                <option value="yes">あり</option>
              </select>
              <div id="medication-details-${
                this.currentPatient.id
              }" style="margin-top: 10px; display: none;">
                <textarea id="medication-list-${
                  this.currentPatient.id
                }" placeholder="薬剤名をご記入ください"></textarea>
              </div>
            </div>
            
            <div class="form-group">
              <label for="pneumonia-history-${
                this.currentPatient.id
              }">肺炎の既往</label>
              <select id="pneumonia-history-${this.currentPatient.id}">
                <option value="no">なし</option>
                <option value="yes">あり</option>
                <option value="repeated">繰り返しあり</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="height-${this.currentPatient.id}">身長 (cm)</label>
              <input type="number" id="height-${
                this.currentPatient.id
              }" placeholder="例：165">
            </div>
            
            <div class="form-group">
              <label for="weight-${this.currentPatient.id}">体重 (kg)</label>
              <input type="number" id="weight-${
                this.currentPatient.id
              }" placeholder="例：60">
            </div>
            
            <div class="form-group">
              <label for="bmi-${this.currentPatient.id}">BMI</label>
              <div class="input-group">
                <input type="text" id="bmi-${this.currentPatient.id}" readonly>
                <div class="input-group-append">
                  <button type="button" onclick="window.patientManager.calculateBMI()">計算</button>
                </div>
              </div>
            </div>
          </div>
          
          <button onclick="window.patientManager.saveGeneralConditions()" class="btn-success">全身状態を保存</button>
        </div>
      </div>
    `;

    content.innerHTML = patientInfoHTML;
    await this.loadGeneralConditions();

    console.log("患者情報読み込み完了");
  }

  openPatientHistory() {
    if (window.app && typeof window.app.openTab === "function") {
      window.app.openTab("patient-history");
    } else {
      this.directTabSwitch("patient-history");
    }
  }

  toggleMedicationDetails() {
    if (!this.currentPatient) return;

    const medicationStatus = document.getElementById(
      `medication-status-${this.currentPatient.id}`
    );
    const medicationDetails = document.getElementById(
      `medication-details-${this.currentPatient.id}`
    );

    if (medicationStatus && medicationDetails) {
      if (medicationStatus.value === "yes") {
        medicationDetails.style.display = "block";
      } else {
        medicationDetails.style.display = "none";
      }
    }
  }

  calculateBMI() {
    if (!this.currentPatient) return;

    const heightElement = document.getElementById(
      `height-${this.currentPatient.id}`
    );
    const weightElement = document.getElementById(
      `weight-${this.currentPatient.id}`
    );
    const bmiElement = document.getElementById(`bmi-${this.currentPatient.id}`);

    if (!heightElement || !weightElement || !bmiElement) return;

    const height = parseFloat(heightElement.value) / 100;
    const weight = parseFloat(weightElement.value);

    if (height > 0 && weight > 0) {
      const bmi = (weight / (height * height)).toFixed(1);
      bmiElement.value = bmi;
    } else {
      alert("身長と体重を正しく入力してください");
    }
  }

  // 全身状態の保存（最小修正版）
  async saveGeneralConditions() {
    if (!this.currentPatient) return;

    try {
      // データベース準備完了を待つ
      await this.waitForDatabaseReady();

      const diseases = Array.from(
        document.querySelectorAll(
          `input[name="disease-${this.currentPatient.id}"]:checked`
        )
      ).map((cb) => cb.value);
      const medicationStatus = document.getElementById(
        `medication-status-${this.currentPatient.id}`
      ).value;
      const medicationList = document.getElementById(
        `medication-list-${this.currentPatient.id}`
      ).value;

      const generalCondition = {
        patient_id: this.currentPatient.id,
        height:
          parseFloat(
            document.getElementById(`height-${this.currentPatient.id}`).value
          ) || null,
        weight:
          parseFloat(
            document.getElementById(`weight-${this.currentPatient.id}`).value
          ) || null,
        bmi:
          parseFloat(
            document.getElementById(`bmi-${this.currentPatient.id}`).value
          ) || null,
        diseases: JSON.stringify(diseases),
        medications: medicationStatus === "yes" ? medicationList : "",
        pneumonia_history: document.getElementById(
          `pneumonia-history-${this.currentPatient.id}`
        ).value,
        assessment_date: new Date().toISOString().split("T")[0],
      };

      await window.db.createGeneralCondition(generalCondition);
      this.showNotification("全身状態が保存されました", "success");
    } catch (error) {
      console.error("全身状態保存エラー:", error);
      this.showNotification("保存に失敗しました: " + error.message, "error");
    }
  }

  async loadGeneralConditions() {
    if (!this.currentPatient) {
      console.warn("currentPatient が設定されていません");
      return;
    }

    try {
      console.log("全身状態読み込み - 患者ID:", this.currentPatient.id);

      // データベース準備完了を待つ
      await this.waitForDatabaseReady();

      const condition = await window.db.getLatestGeneralCondition(
        this.currentPatient.id
      );
      console.log("取得した全身状態データ:", condition);

      if (condition) {
        this.fillGeneralConditionsForm(condition);
      } else {
        console.log("全身状態データが見つかりませんでした");
        this.clearGeneralConditionsForm();
      }
    } catch (error) {
      console.error("全身状態読み込みエラー:", error);
    }
  }

  clearGeneralConditionsForm() {
    if (!this.currentPatient) return;

    const checkboxes = document.querySelectorAll(
      `input[name="disease-${this.currentPatient.id}"]`
    );
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });

    const medicationStatus = document.getElementById(
      `medication-status-${this.currentPatient.id}`
    );
    if (medicationStatus) {
      medicationStatus.value = "no";
      this.toggleMedicationDetails();
    }

    const pneumoniaHistory = document.getElementById(
      `pneumonia-history-${this.currentPatient.id}`
    );
    if (pneumoniaHistory) {
      pneumoniaHistory.value = "no";
    }

    const numericFields = [
      `height-${this.currentPatient.id}`,
      `weight-${this.currentPatient.id}`,
      `bmi-${this.currentPatient.id}`,
    ];
    numericFields.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.value = "";
      }
    });

    const medicationList = document.getElementById(
      `medication-list-${this.currentPatient.id}`
    );
    if (medicationList) {
      medicationList.value = "";
    }
  }

  fillGeneralConditionsForm(condition) {
    if (!this.currentPatient) return;

    this.clearGeneralConditionsForm();

    if (condition.height) {
      const heightElement = document.getElementById(
        `height-${this.currentPatient.id}`
      );
      if (heightElement) heightElement.value = condition.height;
    }

    if (condition.weight) {
      const weightElement = document.getElementById(
        `weight-${this.currentPatient.id}`
      );
      if (weightElement) weightElement.value = condition.weight;
    }

    if (condition.bmi) {
      const bmiElement = document.getElementById(
        `bmi-${this.currentPatient.id}`
      );
      if (bmiElement) bmiElement.value = condition.bmi;
    }

    if (condition.diseases) {
      try {
        const diseases = JSON.parse(condition.diseases);
        diseases.forEach((disease) => {
          const checkbox = document.querySelector(
            `input[name="disease-${this.currentPatient.id}"][value="${disease}"]`
          );
          if (checkbox) checkbox.checked = true;
        });
      } catch (error) {
        console.error("疾患データの解析エラー:", error);
      }
    }

    if (condition.medications) {
      const medicationStatus = document.getElementById(
        `medication-status-${this.currentPatient.id}`
      );
      const medicationList = document.getElementById(
        `medication-list-${this.currentPatient.id}`
      );

      if (medicationStatus && medicationList) {
        medicationStatus.value = "yes";
        medicationList.value = condition.medications;
        this.toggleMedicationDetails();
      }
    }

    if (condition.pneumonia_history) {
      const pneumoniaHistory = document.getElementById(
        `pneumonia-history-${this.currentPatient.id}`
      );
      if (pneumoniaHistory)
        pneumoniaHistory.value = condition.pneumonia_history;
    }
  }

  // モーダル関連（最小修正版）
  async showAddPatientModal() {
    try {
      // データベース準備完了を待つ
      await this.waitForDatabaseReady();

      const modalTitle = document.getElementById("modal-title");
      const patientForm = document.getElementById("patient-form");
      const editPatientId = document.getElementById("edit-patient-id");
      const addPatientModal = document.getElementById("addPatientModal");

      if (!modalTitle || !patientForm || !editPatientId || !addPatientModal) {
        console.error("モーダル要素が見つかりません");
        return;
      }

      modalTitle.textContent = "新規患者登録";
      patientForm.reset();
      editPatientId.value = "";
      addPatientModal.style.display = "block";
    } catch (error) {
      console.error("患者登録モーダル表示エラー:", error);
      this.showNotification("モーダルの表示に失敗しました", "error");
    }
  }

  closeAddPatientModal() {
    const addPatientModal = document.getElementById("addPatientModal");
    if (addPatientModal) {
      addPatientModal.style.display = "none";
    }
  }

  async editPatient(patientId) {
    try {
      // データベース準備完了を待つ
      await this.waitForDatabaseReady();

      const patient = await window.db.getPatient(patientId);
      if (patient) {
        this.fillPatientForm(patient);
        const modalTitle = document.getElementById("modal-title");
        const addPatientModal = document.getElementById("addPatientModal");

        if (modalTitle) modalTitle.textContent = "患者情報編集";
        if (addPatientModal) addPatientModal.style.display = "block";
      }
    } catch (error) {
      console.error("患者情報取得エラー:", error);
      this.showNotification(
        "患者情報の取得に失敗しました: " + error.message,
        "error"
      );
    }
  }

  fillPatientForm(patient) {
    const editPatientId = document.getElementById("edit-patient-id");
    const modalPatientName = document.getElementById("modal-patient-name");
    const modalPatientId = document.getElementById("modal-patient-id");
    const modalPatientKana = document.getElementById("modal-patient-kana");
    const modalBirthdate = document.getElementById("modal-birthdate");
    const modalGender = document.getElementById("modal-gender");
    const modalPhone = document.getElementById("modal-phone");
    const modalAddress = document.getElementById("modal-address");

    if (editPatientId) editPatientId.value = patient.id;
    if (modalPatientName) modalPatientName.value = patient.name;
    if (modalPatientId) modalPatientId.value = patient.patient_id;
    if (modalPatientKana) modalPatientKana.value = patient.name_kana || "";
    if (modalBirthdate) modalBirthdate.value = patient.birthdate || "";
    if (modalGender) modalGender.value = patient.gender || "";
    if (modalPhone) modalPhone.value = patient.phone || "";
    if (modalAddress) modalAddress.value = patient.address || "";
  }

  // 患者削除（最小修正版）
  async deletePatient(patientId) {
    if (
      !confirm(
        "本当にこの患者を削除しますか？関連するすべてのデータも削除されます。"
      )
    ) {
      return;
    }

    try {
      // データベース準備完了を待つ
      await this.waitForDatabaseReady();

      console.log("=== 患者削除処理開始 ===");
      console.log("削除対象患者ID:", patientId);

      await window.db.deletePatient(patientId);
      console.log("削除完了");

      if (window.firebaseManager && window.firebaseManager.isAvailable()) {
        await window.firebaseManager.handlePatientDeletion();
      }

      this.showNotification("患者が削除されました", "success");

      await this.loadPatients();

      if (this.currentPatient && this.currentPatient.id === patientId) {
        console.log("選択中の患者が削除されたため、データをクリア");
        this.clearAllPatientData();
      }

      console.log("=== 患者削除処理完了 ===");
    } catch (error) {
      console.error("患者削除エラー:", error);
      this.showNotification("削除に失敗しました: " + error.message, "error");
    }
  }

  // 患者フォーム送信処理（最小修正版）
  async handlePatientFormSubmit(event) {
    event.preventDefault();

    try {
      // データベース準備完了を待つ
      await this.waitForDatabaseReady();

      const editIdElement = document.getElementById("edit-patient-id");
      const editId = editIdElement ? editIdElement.value : "";

      if (!editId) {
        console.log("新規患者登録の制限チェック開始");

        if (window.firebaseManager && window.firebaseManager.isAvailable()) {
          const creationResult =
            await window.firebaseManager.handlePatientCreation();

          if (!creationResult.success) {
            if (creationResult.limitReached) {
              this.showUpgradePrompt(creationResult.limitInfo);
              return;
            } else if (creationResult.isOffline) {
              this.handleOfflineError();
              return;
            }
          }
        }
      }

      const modalPatientName = document.getElementById("modal-patient-name");
      const modalPatientId = document.getElementById("modal-patient-id");
      const modalPatientKana = document.getElementById("modal-patient-kana");
      const modalBirthdate = document.getElementById("modal-birthdate");
      const modalGender = document.getElementById("modal-gender");
      const modalPhone = document.getElementById("modal-phone");
      const modalAddress = document.getElementById("modal-address");

      const patientData = {
        name: modalPatientName ? modalPatientName.value.trim() : "",
        patient_id: modalPatientId ? modalPatientId.value.trim() : "",
        name_kana: modalPatientKana ? modalPatientKana.value.trim() : "",
        birthdate: modalBirthdate ? modalBirthdate.value : "",
        gender: modalGender ? modalGender.value : "",
        phone: modalPhone ? modalPhone.value.trim() : "",
        address: modalAddress ? modalAddress.value.trim() : "",
      };

      // セキュリティバリデーション
      if (window.securityUtils) {
        const validation = window.securityUtils.validatePatientData(patientData);
        if (!validation.isValid) {
          alert('入力エラー:\n' + validation.errors.join('\n'));
          return;
        }
        
        // 機密情報検出チェック
        const sensitiveCheck = window.securityUtils.detectSensitiveData(
          Object.values(patientData).join(' ')
        );
        if (sensitiveCheck.hasSensitiveData && sensitiveCheck.riskLevel === 'high') {
          if (!confirm('入力内容に個人情報が含まれている可能性があります。続行しますか？')) {
            return;
          }
        }
      }

      let updatedPatient;

      if (editId) {
        updatedPatient = await window.db.updatePatient(editId, patientData);
        this.showNotification("患者情報が更新されました", "success");

        if (this.currentPatient && this.currentPatient.id === editId) {
          this.currentPatient = updatedPatient;
          await this.loadPatientInfo();
        }
      } else {
        updatedPatient = await window.db.createPatient(patientData);

        if (window.firebaseManager && window.firebaseManager.isAvailable()) {
          await window.firebaseManager.syncPatientCountFromFirestore();
        }

        this.showNotification("患者が登録されました", "success");
      }

      this.closeAddPatientModal();
      await this.loadPatients();
    } catch (error) {
      console.error("患者保存エラー:", error);
      this.showNotification("保存に失敗しました: " + error.message, "error");
    }
  }

  // 履歴表示（最小修正版）
  async loadPatientHistory() {
    if (!this.currentPatient) return;

    const content = document.getElementById("patient-history-content");
    if (!content) {
      console.error("patient-history-content要素が見つかりません");
      return;
    }

    try {
      // データベース準備完了を待つ
      await this.waitForDatabaseReady();

      const [assessments, progressRecords, managementPlans] = await Promise.all(
        [
          window.db.getAssessments(this.currentPatient.id),
          window.db.getProgressRecords(this.currentPatient.id),
          window.db.getManagementPlans(this.currentPatient.id),
        ]
      );

      this.displayPatientHistory(assessments, progressRecords, managementPlans);
    } catch (error) {
      console.error("履歴読み込みエラー:", error);
      content.innerHTML = "<p>履歴の読み込みに失敗しました。</p>";
    }
  }

  displayPatientHistory(assessments, progressRecords, managementPlans) {
    const content = document.getElementById("patient-history-content");
    if (!content) return;

    let html = `
      <div class="summary-card">
        <h3>患者情報</h3>
        <p>患者名: ${this.currentPatient.name} (ID: ${this.currentPatient.patient_id})</p>
      </div>

      <div class="summary-card">
        <h3>検査履歴</h3>
    `;

    if (assessments.length === 0) {
      html += "<p>検査履歴がありません。</p>";
    } else {
      html += `
        <table>
          <thead>
            <tr>
              <th>検査日</th>
              <th>診断結果</th>
              <th>該当項目数</th>
              <th>管理計画書</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
      `;

      assessments.forEach((assessment) => {
        // この検査に関連する管理計画書を検索
        const relatedPlan = managementPlans.find(p => p.assessment_id === assessment.id);
        let planInfo = "<span style='color: #999;'>未作成</span>";
        
        if (relatedPlan) {
          const planDate = new Date(relatedPlan.plan_date).toLocaleDateString();
          planInfo = `<span style='color: #007bff; cursor: pointer;' onclick="window.patientManager.viewManagementPlanDetails('${relatedPlan.id}')" title="クリックで詳細表示">${planDate}</span>`;
        }

        html += `
          <tr>
            <td>${new Date(
              assessment.assessment_date
            ).toLocaleDateString()}</td>
            <td>
              <span class="status-badge ${
                assessment.diagnosis_result
                  ? "status-diagnosed"
                  : "status-normal"
              }">
                ${assessment.diagnosis_result ? "口腔機能低下症" : "正常"}
              </span>
            </td>
            <td>${assessment.affected_items_count}/7項目</td>
            <td>${planInfo}</td>
            <td>
              <button onclick="window.assessmentManager && window.assessmentManager.viewAssessmentDetails('${
                assessment.id
              }')" class="btn-secondary" style="padding: 5px 10px;">詳細</button>
            </td>
          </tr>
        `;
      });

      html += "</tbody></table>";
    }
    html += "</div>";

    // 管理計画書履歴
    html += `
      <div class="summary-card">
        <h3>管理計画書履歴</h3>
    `;

    if (managementPlans.length === 0) {
      html += "<p>管理計画書がありません。</p>";
    } else {
      html += `<table><thead><tr><th>作成日</th><th>対象検査日</th><th>診断結果</th><th>再評価予定</th><th>管理項目</th><th>操作</th></tr></thead><tbody>`;

      managementPlans.forEach((plan) => {
        const managementItems = [
          plan.hygiene_plan,
          plan.dryness_plan,
          plan.bite_plan,
          plan.lip_plan,
          plan.tongue_pressure_plan,
          plan.mastication_plan,
          plan.swallowing_plan,
        ].filter((item) => item !== null && item !== undefined).length;

        const planDate = new Date(plan.plan_date);
        const reevaluationDate = new Date(planDate);
        reevaluationDate.setMonth(
          reevaluationDate.getMonth() + (plan.reevaluation_period || 6)
        );

        // 対象検査を検索
        const relatedAssessment = assessments.find(a => a.id === plan.assessment_id);
        let assessmentInfo = "関連検査なし";
        let diagnosisInfo = "-";
        
        if (relatedAssessment) {
          const assessmentDate = new Date(relatedAssessment.assessment_date).toLocaleDateString();
          assessmentInfo = `<span style='color: #007bff; cursor: pointer;' onclick="window.assessmentManager && window.assessmentManager.viewAssessmentDetails('${relatedAssessment.id}')" title="クリックで検査詳細表示">${assessmentDate}</span>`;
          diagnosisInfo = `<span class="status-badge ${
            relatedAssessment.diagnosis_result ? "status-diagnosed" : "status-normal"
          }">${relatedAssessment.diagnosis_result ? "口腔機能低下症" : "正常"}</span>`;
        }

        html += `
          <tr>
            <td>${planDate.toLocaleDateString()}</td>
            <td>${assessmentInfo}</td>
            <td>${diagnosisInfo}</td>
            <td>${reevaluationDate.toLocaleDateString()}</td>
            <td>${managementItems}項目</td>
            <td>
              <button onclick="window.patientManager.viewManagementPlanDetails('${
                plan.id
              }')" class="btn-secondary" style="padding: 5px 10px;">詳細</button>
            </td>
          </tr>
        `;
      });
      html += "</tbody></table>";
    }
    html += "</div>";

    // 管理指導記録
    html += `<div class="summary-card"><h3>管理指導記録</h3>`;

    if (progressRecords.length === 0) {
      html += "<p>管理指導記録がありません。</p>";
    } else {
      html += `<table><thead><tr><th>記録日</th><th>全体評価</th><th>所見</th><th>操作</th></tr></thead><tbody>`;

      progressRecords.forEach((record) => {
        const ratings = [
          record.nutrition_rating,
          record.hygiene_rating,
          record.dryness_rating,
          record.bite_rating,
          record.lip_rating,
          record.tongue_rating,
          record.mastication_rating,
          record.swallowing_rating,
        ].filter((r) => r !== null && r !== undefined);

        const avgRating =
          ratings.length > 0
            ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
            : "N/A";

        html += `
          <tr>
            <td>${new Date(record.record_date).toLocaleDateString()}</td>
            <td>平均: ${avgRating}</td>
            <td>${record.findings_oral ? "所見あり" : "所見なし"}</td>
            <td>
              <button onclick="window.managementManager && window.managementManager.viewProgressRecord('${
                record.id
              }')" class="btn-secondary" style="padding: 5px 10px;">詳細</button>
            </td>
          </tr>
        `;
      });
      html += "</tbody></table>";
    }
    html += "</div>";

    content.innerHTML = html;
  }

  async viewManagementPlanDetails(planId) {
    try {
      // データベース準備完了を待つ
      await this.waitForDatabaseReady();

      const [managementPlans, assessments] = await Promise.all([
        window.db.getManagementPlans(this.currentPatient.id),
        window.db.getAssessments(this.currentPatient.id)
      ]);
      
      const plan = managementPlans.find((p) => p.id === planId);

      if (plan) {
        const relatedAssessment = assessments.find(a => a.id === plan.assessment_id);
        this.displayManagementPlanDetails(plan, relatedAssessment);
      }
    } catch (error) {
      console.error("管理計画書詳細表示エラー:", error);
      this.showNotification(
        "詳細の表示に失敗しました: " + error.message,
        "error"
      );
    }
  }

  displayManagementPlanDetails(plan, relatedAssessment = null) {
    const content = document.getElementById("management-plan-content");

    if (!content) {
      console.error("management-plan-content 要素が見つかりません");
      return;
    }

    const managementText = (value) => {
      switch (value) {
        case 1:
          return "問題なし";
        case 2:
          return "機能維持";
        case 3:
          return "機能向上";
        default:
          return "未設定";
      }
    };

    const planDate = new Date(plan.plan_date);
    const reevaluationDate = new Date(planDate);
    reevaluationDate.setMonth(
      reevaluationDate.getMonth() + (plan.reevaluation_period || 6)
    );

    // 対象検査情報
    let assessmentInfo = "";
    if (relatedAssessment) {
      const assessmentDate = new Date(relatedAssessment.assessment_date).toLocaleDateString();
      const diagnosisText = relatedAssessment.diagnosis_result ? "口腔機能低下症" : "正常";
      const statusClass = relatedAssessment.diagnosis_result ? "status-diagnosed" : "status-normal";
      
      assessmentInfo = `
        <p>対象検査日: ${assessmentDate}</p>
        <p>診断結果: <span class="status-badge ${statusClass}">${diagnosisText}</span> (${relatedAssessment.affected_items_count}/7項目該当)</p>
      `;
    } else {
      assessmentInfo = `<p>対象検査: <span style="color: #999;">関連検査が見つかりません</span></p>`;
    }

    content.innerHTML = `
      <div class="summary-card">
        <h3>管理計画書詳細</h3>
        <p>患者名: ${this.currentPatient.name}</p>
        <p>作成日: ${planDate.toLocaleDateString()}</p>
        ${assessmentInfo}
        <p>再評価予定: ${reevaluationDate.toLocaleDateString()} (${
      plan.reevaluation_period || 6
    }か月後)</p>
      </div>

      <div class="summary-card">
        <h3>管理方針</h3>
        <table>
          <thead><tr><th>項目</th><th>管理方針</th></tr></thead>
          <tbody>
            <tr><td>① 口腔衛生状態</td><td>${managementText(
              plan.hygiene_plan
            )}</td></tr>
            <tr><td>② 口腔乾燥</td><td>${managementText(
              plan.dryness_plan
            )}</td></tr>
            <tr><td>③ 咬合力低下</td><td>${managementText(
              plan.bite_plan
            )}</td></tr>
            <tr><td>④ 舌口唇運動機能低下</td><td>${managementText(
              plan.lip_plan
            )}</td></tr>
            <tr><td>⑤ 低舌圧</td><td>${managementText(
              plan.tongue_pressure_plan
            )}</td></tr>
            <tr><td>⑥ 咀嚼機能低下</td><td>${managementText(
              plan.mastication_plan
            )}</td></tr>
            <tr><td>⑦ 嚥下機能低下</td><td>${managementText(
              plan.swallowing_plan
            )}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="summary-card">
        <h3>管理目標・計画</h3>
        <div style="white-space: pre-wrap; background: #f9f9f9; padding: 15px; border-radius: 4px; border: 1px solid #ddd;">
${plan.goals || "記載なし"}
        </div>
      </div>

      <div style="margin-top: 30px;">
        <button onclick="window.patientManager.openPatientHistory()" class="btn-secondary">履歴に戻る</button>
        <button onclick="window.print()" class="btn-secondary">印刷</button>
        <button onclick="window.managementManager && window.managementManager.loadProgressRecordForm()" class="btn-success">管理指導記録作成</button>
      </div>
    `;

    if (window.app && typeof window.app.openTab === "function") {
      window.app.openTab("management-plan");
    } else {
      this.directTabSwitch("management-plan");
    }
  }
}

// グローバルインスタンス（即座に初期化）
const patientManager = new PatientManager();

// ウィンドウオブジェクトに登録（他のファイルからアクセス可能にする）
window.patientManager = patientManager;

// グローバル関数として公開（HTMLのonclick属性から呼び出し可能にする）
window.showAddPatientModal = () => patientManager.showAddPatientModal();
window.selectPatient = (patientId) => patientManager.selectPatient(patientId);
window.editPatient = (patientId) => patientManager.editPatient(patientId);
window.deletePatient = (patientId) => patientManager.deletePatient(patientId);

console.log(
  "patients.js (最小修正版 - 既存機能との完全互換性維持) 読み込み完了"
);
