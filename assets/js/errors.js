/* 统一错误类型与用户可见文案映射。页面层只认这里的错误码，不拼原始异常信息。 */
(function () {
  window.CTA = window.CTA || {};
  const messages = {
    DATA_LOAD_FAILED: '数据加载失败，请检查网络后重试。',
    DATA_NOT_FOUND: '没有找到这个目的地，它可能尚未发布或已下线。',
    WEATHER_UNAVAILABLE: '天气暂不可用，请稍后再试。',
    WEATHER_STALE: '天气数据可能已过期。',
    NETWORK_OFFLINE: '当前处于离线状态，显示的是已缓存内容。',
    INVALID_INPUT: '输入不完整或不符合要求，请检查标红项。',
    EMPTY_RESULT: '没有符合条件的目的地，试试放宽筛选条件。',
    PLAN_SAVE_FAILED: '保存失败，仅本次会话有效，请检查浏览器存储设置后重试。',
    UNKNOWN: '出现未知问题，请刷新页面重试。',
  };
  class AppError extends Error {
    constructor(code, cause) {
      super(messages[code] || messages.UNKNOWN);
      this.name = 'AppError';
      this.code = code;
      this.cause = cause || null;
    }
  }
  CTA.AppError = AppError;
  CTA.errorMessage = function (code) { return messages[code] || messages.UNKNOWN; };
})();
