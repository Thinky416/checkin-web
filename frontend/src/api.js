/** 后端接口封装：所有请求都走 /api，开发态由 Vite 代理到 8080。 */

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
  } catch (e) {
    throw new Error('连不上后端，确认 Spring Boot 是否已启动（8080）');
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    throw new Error((data && data.message) || `请求失败（${res.status}）`);
  }
  return data;
}

export const getState = () => request('/state');

export const savePlan = (plan) =>
  request('/plan', { method: 'PUT', body: JSON.stringify(plan) });

export const checkIn = () => request('/checkins', { method: 'POST' });

export const cancelCheckIn = (date) => request(`/checkins/${date}`, { method: 'DELETE' });

export const clearAllCheckIns = () => request('/checkins', { method: 'DELETE' });
