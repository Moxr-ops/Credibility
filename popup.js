document.getElementById('calculateButton').addEventListener('click', async function() {
  const inputText = document.getElementById('inputField').value;
  const result = document.getElementById('result');
  const details = document.getElementById('details');
  const loader = document.getElementById('loader');
  
  result.innerText = '';
  details.innerText = '';
  loader.style.display = 'block';

  try {
    const credibilityScore = await calculateCredibility(inputText);
    result.innerText = `可信度系数: ${credibilityScore.toFixed(2)}`;
    details.innerText = '详细信息将显示在这里';
  } catch (error) {
    result.innerText = '计算失败';
    details.innerText = error.message;
  } finally {
    loader.style.display = 'none';
  }
});

async function calculateCredibility(text) {
  const weights = await getMediaWeights();
  console.log('Media weights:', weights);
  
  const mediaScores = await Promise.all(Object.keys(weights).map(async (media) => {
    const score = await searchMedia(media, text);
    console.log(`Score for ${media}:`, score);
    return score * weights[media];
  }));
  
  console.log('Media scores:', mediaScores);
  
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  console.log('Total weight:', totalWeight);
  
  const credibilityScore = totalWeight > 0 ? mediaScores.reduce((a, b) => a + b, 0) / totalWeight : 0;
  console.log('Credibility score:', credibilityScore);
  
  return credibilityScore;
}

async function getMediaWeights() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('mediaWeights', function(data) {
      const weights = data.mediaWeights || {
        '新华网': 0.9,
        '人民网': 0.8,
        'BBC中文网': 0.7,
      };
      console.log('Retrieved weights:', weights);
      resolve(weights);
    });
  });
}

async function searchMedia(media, text) {
  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url: 'https://www.bing.com', active: false }, (tab) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: searchInTab,
        args: [media, text]
      }, (results) => {
        chrome.tabs.remove(tab.id);
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(results[0].result);
        }
      });
    });
  });
}

function searchInTab(media, text) {
  const query = encodeURIComponent(`site:${media} ${text}`);
  const url = `https://www.bing.com/search?q=${query}`;
  
  return new Promise((resolve) => {
    fetch(url)
      .then(response => {
        console.log('Fetch response:', response);
        return response.text();
      })
      .then(html => {
        console.log('HTML content:', html.substring(0, 200)); // 只打印前200个字符
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const resultStats = doc.querySelector('.sb_count');
        console.log('Result stats element:', resultStats);
        const totalResults = resultStats ? resultStats.textContent.match(/\d+/g).join('') : '0';
        console.log('Total results:', totalResults);
        const relevanceScore = Math.min(1, parseInt(totalResults) / 100);
        console.log('Relevance score:', relevanceScore);
        resolve(relevanceScore);
      })
      .catch((error) => {
        console.error('Error in searchInTab:', error);
        resolve(0);
      });
  });
}

function showDebugInfo(message) {
  const debugElement = document.getElementById('debug');
  debugElement.innerHTML += message + '<br>';
}

// 在计算开始时显示调试信息
showDebugInfo('开始计算...');
// ...其他地方也可以使用

window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global error:', message, 'at', source, lineno, colno, error);
  showDebugInfo(`Global error: ${message}`);
};
