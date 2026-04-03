// Слушаем сообщения от content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sendToSheets') {
    const { userName, clientId, type } = request.data;
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby4rvls-8aUQrcsaaJbxcATvRWPM5CpWXi7wdCtEp9tMH-9GQvp190peI9mPlH7fUU/exec'; // ваш URL

    fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName, clientId, type })
    })
    .then(async response => {
      const text = await response.text();
      let json;
      try { json = JSON.parse(text); } catch(e) { json = { status: 'unknown', message: text }; }
      if (response.ok && json.status === 'OK') {
        sendResponse({ success: true, message: `✅ Записано: ${type} для ID ${clientId}` });
      } else {
        sendResponse({ success: false, message: `❌ Ошибка: ${json.message || text}` });
      }
    })
    .catch(error => {
      sendResponse({ success: false, message: `❌ Ошибка отправки: ${error.message}` });
    });
    return true; // сохраняем канал для асинхронного ответа
  }
});
