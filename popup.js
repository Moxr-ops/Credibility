// 确保在侧边栏环境中也能正常工作
// if (browser.sidePanel) {
//   browser.sidePanel.onShow.addListener(() => {
//     // 侧边栏打开时可以执行一些初始化操作
//     console.log('Side panel opened');
//   });
// } else {
//   console.log('Side panel API not available');
// }

const browser = chrome;

document.addEventListener('DOMContentLoaded', function() {
  const calculateButton = document.getElementById('calculateButton');
  const inputField = document.getElementById('inputField');
  const result = document.getElementById('result');
  const details = document.getElementById('details');
  const loader = document.getElementById('loader');
  const optionsLink = document.getElementById('optionsLink');

  calculateButton.addEventListener('click', calculateCredibilityScore);
  inputField.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      calculateCredibilityScore();
    }
  });

  optionsLink.addEventListener('click', function(e) {
    e.preventDefault();
    browser.runtime.openOptionsPage();
  });

  async function calculateCredibilityScore() {
    try {
      await ensureContentScriptLoaded();
      const inputText = inputField.value;
      
      if (!inputText.trim()) {
        showMessage('请输入需要评估的信息', 'error');
        return;
      }

      result.innerText = '';
      details.innerText = '';
      loader.style.display = 'block';

      const credibilityScore = await calculateCredibility(inputText);
      updateTrustMeter(credibilityScore);
      result.innerText = `可信度系数: ${credibilityScore.toFixed(2)}`;
      details.innerText = '详细信息将显示在这里';
      showMessage('计算完成', 'success');
    } catch (error) {
      console.error('Calculation failed:', error);
      result.innerText = '计算失败';
      if (error.message === 'Cannot inject script into browser pages') {
        details.innerText = '无法在浏览器内部页面上运行。请尝试在普通网页上使用此扩展。';
      } else {
        details.innerText = error.message || '未知错误';
      }
      showMessage('计算失败: ' + (error.message || '未知错误'), 'error');
    } finally {
      loader.style.display = 'none';
    }
  }

  function showMessage(message, type) {
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.padding = '10px';
    messageElement.style.marginTop = '10px';
    messageElement.style.borderRadius = '4px';
    messageElement.style.textAlign = 'center';

    if (type === 'error') {
      messageElement.style.backgroundColor = '#ffebee';
      messageElement.style.color = '#c62828';
    } else if (type === 'success') {
      messageElement.style.backgroundColor = '#e8f5e9';
      messageElement.style.color = '#2e7d32';
    }

    result.parentNode.insertBefore(messageElement, result);

    setTimeout(() => {
      messageElement.remove();
    }, 3000);
  }

  async function calculateCredibility(text) {
    const weights = await getMediaWeights();
    console.log('Media weights:', weights);
    
    const mediaScores = await Promise.all(Object.keys(weights).map(async (media) => {
      console.log(`Searching for ${media}...`);
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
      browser.storage.sync.get('mediaWeights', function(data) {
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
      function attemptConnection(retries = 3) {
        console.log(`Attempting to connect to content script (${retries} retries left)`);
        browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs[0]) {
            browser.tabs.sendMessage(tabs[0].id, { action: 'search', media: media, text: text }, (response) => {
              if (browser.runtime.lastError) {
                console.error('Error sending message:', browser.runtime.lastError);
                if (retries > 0) {
                  console.log(`Retrying... (${retries} attempts left)`);
                  setTimeout(() => attemptConnection(retries - 1), 1000);
                } else {
                  reject(new Error('Failed to connect to content script after multiple attempts'));
                }
              } else if (response && response.score !== undefined) {
                console.log(`Received score for ${media}:`, response.score);
                resolve(response.score);
              } else {
                console.error('Invalid response from content script:', response);
                reject(new Error('Invalid response from content script'));
              }
            });
          } else {
            reject(new Error('No active tab'));
          }
        });
      }
      
      attemptConnection();
    });
  }

  async function ensureContentScriptLoaded() {
    return new Promise((resolve, reject) => {
      browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          const currentUrl = tabs[0].url;
          if (currentUrl.startsWith('chrome://') || currentUrl.startsWith('edge://') || currentUrl.startsWith('about:')) {
            reject(new Error('Cannot inject script into browser pages'));
            return;
          }

          browser.tabs.sendMessage(tabs[0].id, { action: 'ping' }, (response) => {
            if (browser.runtime.lastError) {
              console.log('Content script not loaded, injecting now...');
              browser.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['content-script.js']
              }).then(() => {
                console.log('Content script injected successfully');
                resolve();
              }).catch((error) => {
                console.error('Failed to inject content script:', error);
                reject(new Error('Failed to inject content script: ' + error.message));
              });
            } else {
              console.log('Content script already loaded');
              resolve();
            }
          });
        } else {
          reject(new Error('No active tab'));
        }
      });
    });
  }

  function showDebugInfo(message) {
    const debugElement = document.getElementById('debug');
    debugElement.innerHTML += message + '<br>';
  }

  function updateTrustMeter(score) {
    const trustPointer = document.getElementById('trustPointer');
    const trustScore = document.getElementById('trustScore');
    
    // 将分数转换为0-100的范围
    const percentage = (score / 5) * 100;
    
    // 更新指针位置
    trustPointer.style.left = `${percentage}%`;
    
    // 更新分数显示
    trustScore.textContent = `可信度: ${score.toFixed(2)} / 5`;
  }

  // 在计算开始时显示调试信息
  showDebugInfo('开始计算...');
  // ...其他地方也可以使?

  // 全局错误处理
  // window.onerror = function(message, source, lineno, colno, error) {
  //   console.error('Global error:', message, 'at', source, lineno, colno, error);
  //   showDebugInfo(`Global error: ${message}`);
  // };
});
