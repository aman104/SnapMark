export function getPopupAppTitle(): string {
  return 'SnapMark';
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('popup-app');
  if (root) {
    root.textContent = getPopupAppTitle();
  }
}
