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