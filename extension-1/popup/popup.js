import AIProcessor from '../utils/ai.js';

document.addEventListener('DOMContentLoaded', () => {
  const analyzeBtn = document.getElementById('analyze');
  const resultDiv = document.getElementById('result');
  const copyBtn = document.getElementById('copy');
  const apiKeyInput = document.getElementById('apiKey');
  const saveKeyBtn = document.getElementById('saveKey');

  // 加载保存的 API Key
  chrome.storage.local.get(['openaiKey'], (result) => {
    if (result.openaiKey) {
      apiKeyInput.value = result.openaiKey;
    }
  });

  // 保存 API Key
  saveKeyBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value;
    chrome.storage.local.set({ openaiKey: apiKey });
  });

  // 分析页面内容
  analyzeBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 先注入 content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // 然后发送消息
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractContent' });
      const aiProcessor = new AIProcessor(apiKeyInput.value);
      const analysis = await aiProcessor.analyze(response.content);
      
      const mdxContent = aiProcessor.generateMDX({
        ...response,
        ...analysis
      });

      resultDiv.querySelector('code').textContent = mdxContent;
      copyBtn.style.display = 'block';
    } catch (error) {
      resultDiv.querySelector('code').textContent = '发生错误: ' + error.message;
    }
  });

  // 复制内容
  copyBtn.addEventListener('click', () => {
    const content = resultDiv.querySelector('code').textContent;
    navigator.clipboard.writeText(content);
    copyBtn.textContent = '已复制!';
    setTimeout(() => {
      copyBtn.textContent = '复制内容';
    }, 2000);
  });
});
