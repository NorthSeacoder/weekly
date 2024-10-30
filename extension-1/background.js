// 监听扩展安装
chrome.runtime.onInstalled.addListener(() => {
  console.log('扩展已安装');
});

