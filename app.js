// メインアプリケーションクラス
class OralHealthApp {
  constructor() {
    this.init();
  }

  // アプリケーション初期化
  init() {
    // データベース初期化
    db.init();
    
    // イベントリスナーの設定
    this.setupEventListeners();
    
    // 初期データ読み込み
    this.loadInitialData();
    
    console.log('口腔機能低下症診断・管理アプリが開始されました');
  }

  // イベントリスナーの設定
  setupEventListeners() {
    // 患者フォーム送信
    document.getElementById('patient-form').addEventListener('submit', (e) => {
      patientManager.handlePatientFormSubmit(e);
    });

    // モーダルの外側クリックで閉じる
    window.addEventListener('click', (event) => {
      const modal = document.getElementById('addPatientModal');
      if (event.target === modal) {
        patientManager.closeAddPatientModal();
      }
    });

    // 検索機能
    document.getElementById('search-patients').addEventListener('input', () => {
      patientManager.searchPatients();
    });

    // フィルタ機能
    document.getElementById('filter-status').addEventListener('change', () => {
      patientManager.filterPatients();
    });
  }

  // 初期データ読み込み
  async loadInitialData() {
    try {
      await patientManager.loadPatients();
    } catch (error) {
      console.error('初期データ読み込みエラー:', error);
    }
  }

  // タブ切り替え機能
  openTab(tabName) {
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
      content.classList.remove('active');
    });
    
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`.tab[onclick="app.openTab('${tabName}')"]`)?.classList.add('active');

    // タブ切り替え時の処理
    this.handleTabChange(tabName);
  }

  // タブ切り替え時の処理
  handleTabChange(tabName) {
    switch(tabName) {
      case 'patient-list':
        patientManager.loadPatients();
        break;
      case 'patient-history':
        if (patientManager.currentPatient) {
          patientManager.loadPatientHistory();
        }
        break;
      case 'assessment':
        if (!patientManager.currentPatient) {
          document.getElementById('assessment-content').innerHTML = 
            '<p>患者を選択してから検査を開始してください。</p>';
        }
        break;
      case 'diagnosis':
        if (!assessmentManager.currentAssessment) {
          document.getElementById('diagnosis-content').innerHTML = 
            '<p>検査完了後に診断結果が表示されます。</p>';
        }
        break;
      case 'management-plan':
        if (!patientManager.currentPatient || !assessmentManager.currentAssessment) {
          document.getElementById('management-plan-content').innerHTML = 
            '<p>診断完了後に管理計画書が作成できます。</p>';
        }
        break;
      case 'progress-record':
        if (!patientManager.currentPatient) {
          document.getElementById('progress-record-content').innerHTML = 
            '<p>患者を選択して管理指導記録を入力してください。</p>';
        } else {
          managementManager.loadProgressRecordForm();
        }
        break;
    }
  }

  // データエクスポート
  exportDatabase() {
    try {
      const data = db.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `oral_health_data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('データのエクスポートが完了しました');
    } catch (error) {
      console.error('エクスポートエラー:', error);
      alert('エクスポートに失敗しました');
    }
  }

  // データインポート
  importDatabase() {
    const fileInput = document.getElementById('import-file');
    fileInput.click();
  }

  // インポートファイル処理
  handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target.result;
        db.importData(jsonData);
        alert('データのインポートが完了しました');
        
        // データを再読み込み
        patientManager.loadPatients();
        
        // 現在の患者情報をクリア
        patientManager.currentPatient = null;
        assessmentManager.currentAssessment = null;
        
        // 患者一覧タブに移動
        this.openTab('patient-list');
      } catch (error) {
        console.error('インポートエラー:', error);
        alert('インポートに失敗しました: ' + error.message);
      }
    };
    
    reader.readAsText(file);
    
    // ファイル入力をリセット
    event.target.value = '';
  }

  // アプリケーション統計情報の表示
  showStatistics() {
    const stats = db.getStatistics();
    
    alert(`
統計情報:
- 総患者数: ${stats.totalPatients}名
- 総検査回数: ${stats.totalAssessments}回
- 口腔機能低下症患者: ${stats.diagnosedPatients}名
- 正常患者: ${stats.normalPatients}名
    `);
  }

  // デモデータ作成（開発・テスト用）
  createDemoData() {
    if (!confirm('デモデータを作成しますか？既存のデータは削除されます。')) {
      return;
    }

    // データをクリア
    localStorage.removeItem(db.storageKey);
    db.init();

    // デモ患者データ
    const demoPatients = [
      {
        name: '田中 太郎',
        patient_id: 'P001',
        name_kana: 'タナカ タロウ',
        birthdate: '1945-03-15',
        gender: 'male',
        phone: '03-1234-5678',
        address: '東京都新宿区西新宿1-1-1'
      },
      {
        name: '佐藤 花子',
        patient_id: 'P002',
        name_kana: 'サトウ ハナコ',
        birthdate: '1950-07-22',
        gender: 'female',
        phone: '03-9876-5432',
        address: '東京都渋谷区渋谷2-2-2'
      },
      {
        name: '鈴木 一郎',
        patient_id: 'P003',
        name_kana: 'スズキ イチロウ',
        birthdate: '1955-12-03',
        gender: 'male',
        phone: '03-5555-1111',
        address: '東京都品川区大崎3-3-3'
      }
    ];

    // デモデータを作成
    demoPatients.forEach(async (patientData) => {
      try {
        const patient = await db.createPatient(patientData);
        
        // デモ検査データも作成
        const assessment = {
          patient_id: patient.id,
          assessment_date: new Date().toISOString().split('T')[0],
          tci_value: Math.floor(Math.random() * 100),
          tci_status: Math.random() > 0.5,
          moisture_value: 20 + Math.random() * 20,
          dryness_status: Math.random() > 0.5,
          bite_force_value: 200 + Math.random() * 400,
          bite_force_status: Math.random() > 0.5,
          pa_value: 4 + Math.random() * 4,
          ta_value: 4 + Math.random() * 4,
          ka_value: 4 + Math.random() * 4,
          oral_diadochokinesis_status: Math.random() > 0.5,
          tongue_pressure_value: 20 + Math.random() * 20,
          tongue_pressure_status: Math.random() > 0.5,
          glucose_value: 50 + Math.random() * 100,
          mastication_status: Math.random() > 0.5,
          eat10_score: Math.floor(Math.random() * 10),
          swallowing_status: Math.random() > 0.5,
          diagnosis_result: Math.random() > 0.3,
          affected_items_count: Math.floor(Math.random() * 7)
        };
        
        await db.createAssessment(assessment);
      } catch (error) {
        console.error('デモデータ作成エラー:', error);
      }
    });

    setTimeout(() => {
      alert('デモデータが作成されました');
      patientManager.loadPatients();
    }, 1000);
  }
}

// グローバル変数とオブジェクトの初期化
let app = null;

// ページ読み込み前でも実行可能なグローバル関数（修正版）
function openTab(tabName) {
  if (app) {
    app.openTab(tabName);
  } else {
    console.error('アプリケーションが初期化されていません');
  }
}

function exportDatabase() {
  if (app) {
    app.exportDatabase();
  } else {
    console.error('アプリケーションが初期化されていません');
  }
}

function importDatabase() {
  if (app) {
    app.importDatabase();
  } else {
    console.error('アプリケーションが初期化されていません');
  }
}

function handleImportFile(event) {
  if (app) {
    app.handleImportFile(event);
  } else {
    console.error('アプリケーションが初期化されていません');
  }
}

function searchPatients() {
  if (window.patientManager) {
    patientManager.searchPatients();
  } else {
    console.error('患者マネージャーが初期化されていません');
  }
}

function filterPatients() {
  if (window.patientManager) {
    patientManager.filterPatients();
  } else {
    console.error('患者マネージャーが初期化されていません');
  }
}

function showAddPatientModal() {
  if (window.patientManager) {
    patientManager.showAddPatientModal();
  } else {
    console.error('患者マネージャーが初期化されていません');
  }
}

function closeAddPatientModal() {
  if (window.patientManager) {
    patientManager.closeAddPatientModal();
  } else {
    console.error('患者マネージャーが初期化されていません');
  }
}

// 検査開始のグローバル関数（修正版）
function startAssessment() {
  console.log('startAssessment() が呼び出されました');
  
  // 必要なオブジェクトの存在確認
  if (!window.patientManager) {
    console.error('patientManager が初期化されていません');
    alert('アプリケーションの初期化中です。少し待ってから再試行してください。');
    return;
  }
  
  if (!window.assessmentManager) {
    console.error('assessmentManager が初期化されていません');
    alert('検査モジュールの初期化中です。少し待ってから再試行してください。');
    return;
  }
  
  if (!patientManager.currentPatient) {
    console.error('患者が選択されていません');
    alert('患者を選択してください');
    return;
  }
  
  console.log('選択中の患者:', patientManager.currentPatient);
  
  try {
    // 検査を開始
    assessmentManager.startAssessment();
    console.log('検査開始処理が完了しました');
  } catch (error) {
    console.error('検査開始エラー:', error);
    alert('検査の開始に失敗しました: ' + error.message);
  }
}

// 患者管理のグローバル関数（修正版）
function selectPatient(patientId) {
  console.log('selectPatient() が呼び出されました。患者ID:', patientId);
  
  if (!window.patientManager) {
    console.error('patientManager が初期化されていません');
    alert('アプリケーションの初期化中です。少し待ってから再試行してください。');
    return;
  }
  
  try {
    patientManager.selectPatient(patientId);
  } catch (error) {
    console.error('患者選択エラー:', error);
    alert('患者の選択に失敗しました: ' + error.message);
  }
}

function editPatient(patientId) {
  if (window.patientManager) {
    patientManager.editPatient(patientId);
  } else {
    console.error('患者マネージャーが初期化されていません');
  }
}

function deletePatient(patientId) {
  if (window.patientManager) {
    patientManager.deletePatient(patientId);
  } else {
    console.error('患者マネージャーが初期化されていません');
  }
}

// 管理計画書関連のグローバル関数（新規追加）
function createManagementPlan() {
  console.log('createManagementPlan() が呼び出されました');
  
  if (!window.managementManager) {
    console.error('managementManager が初期化されていません');
    alert('管理計画モジュールの初期化中です。少し待ってから再試行してください。');
    return;
  }
  
  if (!window.patientManager || !patientManager.currentPatient) {
    console.error('患者が選択されていません');
    alert('患者を選択してください');
    return;
  }
  
  if (!window.assessmentManager || !assessmentManager.currentAssessment) {
    console.error('検査結果がありません');
    alert('検査を完了してください');
    return;
  }
  
  try {
    managementManager.createManagementPlan();
    console.log('管理計画書作成処理が完了しました');
  } catch (error) {
    console.error('管理計画書作成エラー:', error);
    alert('管理計画書の作成に失敗しました: ' + error.message);
  }
}

// アプリケーション初期化（修正版）
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM読み込み完了 - アプリケーション初期化開始');
  
  try {
    // アプリケーション初期化
    app = new OralHealthApp();
    console.log('メインアプリケーション初期化完了');
    
    // すべてのマネージャーが初期化されているか確認
    setTimeout(() => {
      if (window.patientManager && window.assessmentManager && window.managementManager) {
        console.log('すべてのマネージャーが正常に初期化されました');
      } else {
        console.warn('一部のマネージャーが初期化されていません');
        console.log('patientManager:', !!window.patientManager);
        console.log('assessmentManager:', !!window.assessmentManager);
        console.log('managementManager:', !!window.managementManager);
      }
    }, 100);
    
  } catch (error) {
    console.error('アプリケーション初期化エラー:', error);
    alert('アプリケーションの初期化に失敗しました: ' + error.message);
  }
  
  // 開発者モード：Ctrl+Shift+D でデモデータ作成
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      if (app) {
        app.createDemoData();
      }
    }
  });
});

// ページ離脱前の確認（データ保存の確認）
window.addEventListener('beforeunload', function(e) {
  if (window.assessmentManager && 
      assessmentManager.currentAssessment && 
      Object.values(assessmentManager.assessmentStatus).some(status => status)) {
    e.preventDefault();
    e.returnValue = '検査データが保存されていません。ページを離れますか？';
  }
});