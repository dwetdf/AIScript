// ============================================================================
// 文件选择器 — 命令式 API，从 ImportCard 的隐藏 <input> 模式提取
// 供导入 JSON 项目文件等场景复用
// ============================================================================

/**
 * 触发浏览器文件选择对话框，返回用户选择的文件或 null（用户取消）
 * @param accept - 接受的文件类型，如 '.json'、'.json,.yaml'
 */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';

    // 利用 focus 丢失检测用户是否取消了对话框
    const handleFocus = () => {
      window.removeEventListener('focus', handleFocus);
      // 延迟检查：如果对话框关闭后 500ms 内没有选中文件，视为取消
      setTimeout(() => {
        if (!input.files || input.files.length === 0) {
          input.remove();
          resolve(null);
        }
      }, 500);
    };

    input.onchange = () => {
      window.removeEventListener('focus', handleFocus);
      const file = input.files?.[0] ?? null;
      input.remove();
      resolve(file);
    };

    // 用户点取消时 input 不会触发 change，用 focus 事件兜底
    window.addEventListener('focus', handleFocus);
    document.body.appendChild(input);
    input.click();
  });
}
