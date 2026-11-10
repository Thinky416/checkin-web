/** 纯客户端偏好（音效开关）。存储可能被隐私模式/iframe 禁用，全部兜底。 */

const SOUND_KEY = 'checkin:sound';

export function readSoundPref() {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch (e) {
    return true;
  }
}

export function writeSoundPref(on) {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch (e) {
    /* 存不住就只在本次会话生效 */
  }
}
