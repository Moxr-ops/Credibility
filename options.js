const defaultWeights = {
  '新华网': 0.9,
  '人民网': 0.8,
  'BBC中文网': 0.7,
  // 添加更多默认媒体
};

function loadWeights() {
  chrome.storage.sync.get('mediaWeights', function(data) {
    const weights = data.mediaWeights || defaultWeights;
    const container = document.getElementById('mediaWeights');
    container.innerHTML = '';
    
    for (const [media, weight] of Object.entries(weights)) {
      const div = document.createElement('div');
      div.className = 'media-weight';
      div.innerHTML = `
        <label>${media}:</label>
        <input type="number" min="0" max="1" step="0.1" value="${weight}" data-media="${media}">
      `;
      container.appendChild(div);
    }
  });
}

function saveWeights() {
  const weights = {};
  document.querySelectorAll('.media-weight input').forEach(input => {
    weights[input.dataset.media] = parseFloat(input.value);
  });
  
  chrome.storage.sync.set({mediaWeights: weights}, function() {
    alert('设置已保存');
  });
}

document.addEventListener('DOMContentLoaded', loadWeights);
document.getElementById('saveButton').addEventListener('click', saveWeights);
