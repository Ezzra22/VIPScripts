// ==================== ПРОЕКТЫ ====================
const projects = {
  'CBC': { url: 'https://bo-cbc.qoven.net/players/', fullName: 'CryptoBoss', color: '#58aaff' },
  'HYPE': { url: 'https://bo-hype.qoven.net/players/', fullName: 'Hype', color: '#ce2951' },
  'AUF': { url: 'https://bo-auf.qoven.net/players/', fullName: 'AUF', color: '#ee1dff' },
  'UNLIM': { url: 'https://bo-unlim.qoven.net/players/', fullName: 'UnLim', color: '#fd7748' },
  'HON': { url: 'https://bo-hon.qoven.net/players/', fullName: 'Hone-Money', color: '#e79154' }
};
const projectNames = Object.keys(projects);

// ==================== УМНЫЙ ПАРСИНГ (из версии A) ====================
function extractPairs(text) {
  const pairs = [];
  const numberRegex = /\b(\d+)\b/g;
  const numbers = [];
  let match;
  while ((match = numberRegex.exec(text)) !== null) {
    numbers.push({ number: match[1], index: match.index, length: match[0].length });
  }

  const projectPositions = [];
  for (let proj of projectNames) {
    const regex = new RegExp(`\\b${proj}\\b`, 'gi');
    let m;
    while ((m = regex.exec(text)) !== null) {
      projectPositions.push({ project: m[0].toUpperCase(), index: m.index, length: m[0].length });
    }
  }
  projectPositions.sort((a,b) => a.index - b.index);

  const usedNumbers = new Set();
  const usedProjects = new Set();

  for (let proj of projectPositions) {
    if (usedProjects.has(proj.project)) continue;
    let bestNumber = null;
    let bestDist = Infinity;
    for (let num of numbers) {
      if (usedNumbers.has(num.number + '@' + num.index)) continue;
      if (num.index > proj.index) {
        const dist = num.index - (proj.index + proj.length);
        if (dist < bestDist && dist <= 20) {
          bestDist = dist;
          bestNumber = num;
        }
      }
    }
    if (!bestNumber) {
      for (let num of numbers) {
        if (usedNumbers.has(num.number + '@' + num.index)) continue;
        if (num.index + num.length < proj.index) {
          const dist = proj.index - (num.index + num.length);
          if (dist < bestDist && dist <= 20) {
            bestDist = dist;
            bestNumber = num;
          }
        }
      }
    }
    if (bestNumber) {
      pairs.push({
        project: proj.project,
        number: bestNumber.number,
        url: projects[proj.project].url + bestNumber.number,
        fullName: projects[proj.project].fullName,
        color: projects[proj.project].color
      });
      usedNumbers.add(bestNumber.number + '@' + bestNumber.index);
      usedProjects.add(proj.project);
    }
  }
  if (pairs.length === 0) return null;

  let name = text;
  for (let pair of pairs) {
    name = name.replace(new RegExp(`\\b${pair.project}\\b`, 'gi'), '');
    name = name.replace(new RegExp(`\\b${pair.number}\\b`, 'g'), '');
  }
  name = name.replace(/[:\s]+/g, ' ').trim();
  if (name === '') name = 'игрока';
  return { pairs, name };
}

// ==================== ОПРЕДЕЛЕНИЕ ВЕРСИИ ====================
function isVersionA() {
  return window.location.pathname.includes('/a/');
}

// ==================== ПОИСК ID ДЛЯ ВЕРСИИ K (стабильный из первого скрипта) ====================
const excludedSelectors = [
  '.dialog-title',
  '.profile-avatars-info',
  '.input-field-input',
  '[contenteditable="true"]'
];

function isExcludedNode(node) {
  let parent = node.parentElement;
  while (parent) {
    for (let sel of excludedSelectors) {
      if (parent.matches && parent.matches(sel)) return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

function getClientIdForK() {
  // 1. Ищем элемент .fullName
  const fullNameElem = document.querySelector('.fullName');
  if (fullNameElem && fullNameElem.innerText && /\b[A-Z]{3,5}\s*:?\s*\d+\b/.test(fullNameElem.innerText)) {
    console.log('✅ [K] Найден .fullName:', fullNameElem.innerText);
    const extracted = extractPairs(fullNameElem.innerText);
    if (extracted && extracted.pairs.length) {
      const firstPair = extracted.pairs[0];
      return {
        clientId: firstPair.number,
        project: firstPair.project,
        fullName: extracted.name
      };
    }
  }

  // 2. Ищем ссылку в верхней части страницы
  const links = document.querySelectorAll('a');
  let bestLink = null;
  let bestTop = Infinity;
  for (let link of links) {
    const text = link.innerText.trim();
    if (/\b[A-Z]{3,5}\s*:?\s*\d+\b/.test(text)) {
      const rect = link.getBoundingClientRect();
      if (rect.top > 0 && rect.top < 150 && rect.top < bestTop) {
        bestTop = rect.top;
        bestLink = link;
      }
    }
  }
  if (bestLink) {
    console.log('✅ [K] Найдена ссылка:', bestLink.innerText);
    const extracted = extractPairs(bestLink.innerText);
    if (extracted && extracted.pairs.length) {
      const firstPair = extracted.pairs[0];
      return {
        clientId: firstPair.number,
        project: firstPair.project,
        fullName: extracted.name
      };
    }
  }

  // 3. Поиск текстовых узлов через TreeWalker
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(textNode) {
        if (!textNode.textContent.trim()) return NodeFilter.FILTER_REJECT;
        const parent = textNode.parentElement;
        if (parent && (parent.tagName === 'A' || parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
          return NodeFilter.FILTER_REJECT;
        }
        if (isExcludedNode(textNode)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const candidates = [];
  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (/\b[A-Z]{3,5}\s*:?\s*\d+\b/.test(text)) {
      const rect = node.parentElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.top > 0 && rect.top < 150) {
        candidates.push({ node, text, rect });
      }
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => a.rect.top - b.rect.top);
    const best = candidates[0];
    console.log('✅ [K] Найден текстовый узел:', best.text);
    const extracted = extractPairs(best.text);
    if (extracted && extracted.pairs.length) {
      const firstPair = extracted.pairs[0];
      return {
        clientId: firstPair.number,
        project: firstPair.project,
        fullName: extracted.name
      };
    }
  }

  console.log('❌ [K] Заголовок чата не найден');
  return null;
}

// ==================== ПОИСК ID ДЛЯ ВЕРСИИ A (стабильный из второго скрипта) ====================
function getClientIdForA() {
  const titleSelectors = [
    '.ChatInfo .fullName',
    '.info .title .fullName',
    '.chat-header .title',
    '.chat-header h3',
    '.fullName'
  ];
  let titleElement = null;
  for (let sel of titleSelectors) {
    const elem = document.querySelector(sel);
    if (elem && elem.innerText && /\b[A-Z]{3,5}\s*:?\s*\d+/i.test(elem.innerText)) {
      const rect = elem.getBoundingClientRect();
      const isInLeftPanel = !!elem.closest('.dialogs, .chat-list, .folders-sidebar, .chat-item, .dialog, .dialogs-list');
      if (!isInLeftPanel && rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.top < window.innerHeight) {
        titleElement = elem;
        console.log(`✅ [A] Найден заголовок по селектору: ${sel}, текст: ${elem.innerText}`);
        break;
      }
    }
  }
  if (!titleElement) {
    const candidates = [];
    const allElements = document.querySelectorAll('div, span, h1, h2, h3, p, a, .title, .fullName');
    for (let el of allElements) {
      const text = el.innerText?.trim();
      if (text && /\b[A-Z]{3,5}\s*:?\s*\d+/i.test(text)) {
        const rect = el.getBoundingClientRect();
        const isMessage = !!el.closest('.message-list, .messages-layout, .bubbles, .message');
        const isInLeftPanel = !!el.closest('.dialogs, .chat-list, .folders-sidebar, .chat-item, .dialog, .dialogs-list');
        if (!isMessage && !isInLeftPanel && rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.top < window.innerHeight) {
          candidates.push({ el, text, top: rect.top });
        }
      }
    }
    if (candidates.length > 0) {
      candidates.sort((a, b) => a.top - b.top);
      titleElement = candidates[0].el;
      console.log(`✅ [A] Найден заголовок по тексту: "${candidates[0].text.slice(0, 80)}" (top=${candidates[0].top})`);
    }
  }
  if (!titleElement) {
    console.log('❌ [A] Заголовок чата не найден');
    return null;
  }
  const fullText = titleElement.innerText.trim();
  const extracted = extractPairs(fullText);
  if (!extracted || extracted.pairs.length === 0) return null;
  const firstPair = extracted.pairs[0];
  console.log(`✅ [A] Извлечено: проект ${firstPair.project}, ID ${firstPair.number}, имя ${extracted.name}`);
  return {
    clientId: firstPair.number,
    project: firstPair.project,
    fullName: extracted.name
  };
}

// ==================== ЕДИНАЯ ТОЧКА ВХОДА ====================
function getClientIdFromActiveChat() {
  if (isVersionA()) {
    return getClientIdForA();
  } else {
    return getClientIdForK();
  }
}

// ==================== ОСТАЛЬНЫЕ ФУНКЦИИ (без изменений) ====================
function getUserNameFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['userName'], (result) => resolve(result.userName || null));
  });
}

function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000000;
    background: ${isError ? '#dc3545' : '#28a745'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    transition: opacity 0.3s;
    opacity: 1;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

async function sendToSheetsViaBackground(userName, clientId, type) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'sendToSheets', data: { userName, clientId, type } },
      (response) => {
        if (response && response.success) {
          showToast(`✅ ${type === 'входящие' ? 'Входящее' : 'Исходящее'} для ID ${clientId} записано`, false);
          resolve(true);
        } else {
          const errorMsg = response?.message || 'Неизвестная ошибка';
          alert(`❌ Ошибка: ${errorMsg}`);
          resolve(false);
        }
      }
    );
  });
}

function createFloatingWidget() {
  if (document.getElementById('tg2sheet-widget')) return;

  const widget = document.createElement('div');
  widget.id = 'tg2sheet-widget';
  widget.style.cssText = `
    position: fixed;
    z-index: 999999;
    background: #2c2c2c;
    border-radius: 12px;
    padding: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    display: flex;
    gap: 12px;
    font-family: system-ui, -apple-system, sans-serif;
    cursor: grab;
    user-select: none;
  `;

  chrome.storage.local.get(['widgetLeft', 'widgetTop'], (result) => {
    let left = result.widgetLeft;
    let top = result.widgetTop;
    if (left !== undefined && top !== undefined) {
      widget.style.left = left + 'px';
      widget.style.top = top + 'px';
      widget.style.transform = 'none';
    } else {
      widget.style.left = '50%';
      widget.style.top = '50%';
      widget.style.transform = 'translate(-50%, -50%)';
    }
  });

  const incomingBtn = document.createElement('button');
  incomingBtn.textContent = '📥 Входящие';
  incomingBtn.style.cssText = `padding: 8px 16px; background: #4caf50; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold;`;
  const outgoingBtn = document.createElement('button');
  outgoingBtn.textContent = '📤 Исходящие';
  outgoingBtn.style.cssText = `padding: 8px 16px; background: #ff9800; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold;`;
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✖';
  closeBtn.style.cssText = `background: none; border: none; color: #aaa; cursor: pointer; font-size: 16px; margin-left: 8px;`;
  closeBtn.onclick = () => widget.remove();

  incomingBtn.onclick = async () => {
    const userName = await getUserNameFromStorage();
    if (!userName) {
      alert('Сначала введите своё имя в настройках расширения (иконка справа).');
      return;
    }
    const clientData = getClientIdFromActiveChat();
    if (!clientData) {
      alert('Не удалось определить ID. Убедитесь, что открыт чат с клиентом и заголовок содержит проект и ID (например, "CBC 123123 Имя" или "Имя CBC: 123123").');
      return;
    }
    await sendToSheetsViaBackground(userName, clientData.clientId, 'входящие');
  };

  outgoingBtn.onclick = async () => {
    const userName = await getUserNameFromStorage();
    if (!userName) {
      alert('Сначала введите своё имя в настройках расширения (иконка справа).');
      return;
    }
    const clientData = getClientIdFromActiveChat();
    if (!clientData) {
      alert('Не удалось определить ID. Убедитесь, что открыт чат с клиентом и заголовок содержит проект и ID.');
      return;
    }
    await sendToSheetsViaBackground(userName, clientData.clientId, 'исходящие');
  };

  widget.appendChild(incomingBtn);
  widget.appendChild(outgoingBtn);
  widget.appendChild(closeBtn);
  document.body.appendChild(widget);

  let isDragging = false, offsetX, offsetY;
  widget.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    isDragging = true;
    offsetX = e.clientX - widget.offsetLeft;
    offsetY = e.clientY - widget.offsetTop;
    widget.style.cursor = 'grabbing';
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    let left = e.clientX - offsetX;
    let top = e.clientY - offsetY;
    left = Math.max(0, Math.min(window.innerWidth - widget.offsetWidth, left));
    top = Math.max(0, Math.min(window.innerHeight - widget.offsetHeight, top));
    widget.style.left = left + 'px';
    widget.style.top = top + 'px';
    widget.style.transform = 'none';
  });
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      widget.style.cursor = 'grab';
      const left = parseInt(widget.style.left);
      const top = parseInt(widget.style.top);
      if (!isNaN(left) && !isNaN(top)) {
        chrome.storage.local.set({ widgetLeft: left, widgetTop: top });
      }
    }
  });
}

window.addEventListener('load', createFloatingWidget);
new MutationObserver(() => {
  if (!document.getElementById('tg2sheet-widget')) createFloatingWidget();
}).observe(document.body, { childList: true, subtree: true });
