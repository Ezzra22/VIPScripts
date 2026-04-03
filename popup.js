document.getElementById('save').addEventListener('click', () => {
  const userName = document.getElementById('userName').value.trim();
  if (!userName) {
    document.getElementById('status').textContent = 'Введите имя!';
    document.getElementById('status').style.color = '#dc3545';
    return;
  }
  chrome.storage.sync.set({ userName }, () => {
    document.getElementById('status').textContent = '✓ Сохранено';
    document.getElementById('status').style.color = '#28a745';
    setTimeout(() => {
      document.getElementById('status').textContent = '';
    }, 2000);
  });
});

// Загружаем сохранённое имя при открытии
chrome.storage.sync.get(['userName'], (result) => {
  if (result.userName) {
    document.getElementById('userName').value = result.userName;
  }
});
