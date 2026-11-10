/* Writing desk only: persisted light/dark theme with a live editor switch. */
(() => {
  'use strict';
  const key = 'trn-admin-theme';
  const root = document.documentElement;
  let stored = null;
  try { stored = localStorage.getItem(key); } catch {}
  const systemDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = stored === 'dark' || stored === 'light' ? stored : (systemDark ? 'dark' : 'light');

  function apply(theme, save = false) {
    const dark = theme === 'dark';
    root.dataset.adminTheme = dark ? 'dark' : 'light';
    root.style.colorScheme = dark ? 'dark' : 'light';
    const control = document.getElementById('admin-theme-toggle');
    if (control) {
      control.textContent = dark ? '☀ 日间模式' : '☾ 夜间模式';
      control.setAttribute('aria-label', dark ? '切换到日间模式' : '切换到夜间模式');
      control.setAttribute('aria-pressed', String(dark));
      control.title = dark ? '切换到日间模式' : '切换到夜间模式';
    }
    // TOAST UI's official dark stylesheet is scoped to this class.
    const editor = document.querySelector('#studio-rich-editor .toastui-editor-defaultUI');
    if (editor) editor.classList.toggle('toastui-editor-dark', dark);
    if (save) {
      try { localStorage.setItem(key, dark ? 'dark' : 'light'); } catch {}
    }
  }
  apply(initial); // in <head>, before body paint
  window.TRNAdminTheme = { applyEditor: () => apply(root.dataset.adminTheme) };
  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.adminTheme);
    document.getElementById('admin-theme-toggle')?.addEventListener('click', () => {
      apply(root.dataset.adminTheme === 'dark' ? 'light' : 'dark', true);
    });
  });
})();
