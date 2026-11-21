export function getEditorAppTitle(): string {
  return 'SnapMark Editor';
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('editor-app');
  if (root) {
    root.textContent = getEditorAppTitle();
  }
}
