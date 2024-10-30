console.log('Content script loaded');

const browser = chrome;

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in content script:', request);
  if (request.action === 'ping') {
    console.log('Ping received, responding with ok');
    sendResponse({ status: 'ok' });
  } else if (request.action === 'search') {
    console.log('Search request received:', request);
    searchInPage(request.media, request.text)
      .then(score => {
        console.log('Search completed, score:', score);
        sendResponse({ score: score });
      })
      .catch(error => {
        console.error('Error in searchInPage:', error);
        sendResponse({ score: 0 });
      });
    return true; // 保持消息通道开放
  }
});

function searchInPage(media, text) {
  console.log('Searching for:', media, text);
  const query = encodeURIComponent(`site:${media} ${text}`);
  const url = `https://cn.bing.com/search?q=${query}`;
  
  console.log('Search URL:', url);
  return fetch(url)
    .then(response => {
      console.log('Fetch response:', response);
      return response.text();
    })
    .then(html => {
      console.log('HTML content received, length:', html.length);
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const resultStats = doc.querySelector('.sb_count');
      console.log('Result stats element:', resultStats);
      const totalResults = resultStats ? resultStats.textContent.match(/[\d,]+/) : null;
      console.log('Total results:', totalResults);
      const relevanceScore = totalResults ? Math.min(1, parseInt(totalResults[0].replace(/,/g, '')) / 100) : 0;
      console.log('Calculated relevance score:', relevanceScore);
      return relevanceScore;
    })
    .catch((error) => {
      console.error('Error in searchInPage:', error);
      return 0;
    });
}
