function extractPageContent() {
  const title = document.title;
  const content = document.body.innerText;
  const url = window.location.href;
  
  return {
    title,
    content,
    url,
    date: new Date().toISOString().split('T')[0]
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    sendResponse(extractPageContent());
  }
});

