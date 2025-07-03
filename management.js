// グローバルインスタンス（即座に初期化）
const managementManager = new ManagementManager();

// ウィンドウオブジェクトに登録（他のファイルからアクセス可能にする）
window.managementManager = managementManager;

console.log('management.js 読み込み完了 - managementManager をグローバル登録しました');

// デバッグ用：初期化確認
setTimeout(() => {
  if (window.managementManager) {
    console.log('managementManager グローバル登録確認: OK');
  } else {
    console.error('managementManager グローバル登録確認: NG');
  }
}, 50);
// 確実なグローバル登録
window.managementManager = managementManager;
window.createManagementPlan = function() {
  if (window.managementManager) {
    managementManager.createManagementPlan();
  } else {
    alert('管理計画モジュールが初期化されていません');
  }
};

console.log('management.js: グローバル登録完了');