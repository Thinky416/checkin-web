import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as api from './api.js';
import { fmtKey, pad, todayKey } from './lib/date.js';
import { thud } from './lib/sound.js';
import { readSoundPref, writeSoundPref } from './lib/prefs.js';
import Seal, { SealDefs } from './components/Seal.jsx';
import SettingsSheet from './components/SettingsSheet.jsx';
import SealDetail from './components/SealDetail.jsx';

/**
 * 页面职责：只负责"画"和"交互"，所有规则（每天一次、周期限制、顺序盖）
 * 都在后端 CheckinService 里，前端每次操作后整体替换状态。
 */
export default function App() {
  const [data, setData] = useState(null);          // { title, startDate, endDate, totalDays, records }
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const [pendingPop, setPendingPop] = useState(null);
  const [soundOn, setSoundOn] = useState(readSoundPref);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewing, setViewing] = useState(null);    // { date, index }
  const [toast, setToast] = useState('');

  const gridRef = useRef(null);
  const headerRef = useRef(null);
  const toastTimer = useRef(null);
  const wantDefaultPage = useRef(true);

  /* ---------------- 提示 ---------------- */
  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1800);
  }, []);

  /* ---------------- 加载状态 ---------------- */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.getState());
      setLoadError('');
      wantDefaultPage.current = true;
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------------- 分页容量 ---------------- */
  const computePageSize = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const vw = document.documentElement.clientWidth;
    const narrow = vw <= 430;
    const gap = narrow ? 9 : 12;
    const minW = narrow ? 84 : 92;

    const gridW = grid.clientWidth || Math.min(vw - 32, 780);
    const cols = Math.max(2, Math.floor((gridW + gap) / (minW + gap)));
    const cellW = (gridW - gap * (cols - 1)) / cols;

    const headerH = headerRef.current ? headerRef.current.getBoundingClientRect().height : 0;
    // 顶部内边距 + 标题区 + 间距 + 底部固定操作区
    const used = 26 + headerH + 18 + 190;
    const avail = window.innerHeight - used;

    let rows = Math.floor((avail + gap) / (cellW + gap));
    rows = Math.max(3, Math.min(8, rows));

    setPageSize(Math.max(4, Math.min(48, cols * rows)));
  }, []);

  useLayoutEffect(() => {
    if (data) computePageSize();
  }, [data, computePageSize]);

  useEffect(() => {
    let t = null;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(computePageSize, 200);
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
    };
  }, [computePageSize]);

  /* ---------------- 派生值 ---------------- */
  const total = data?.totalDays ?? 0;
  const records = useMemo(() => data?.records ?? [], [data]);
  const nextIdx = records.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const today = todayKey();
  const doneToday = records.some((r) => r.date === today);
  const beforeStart = data ? today < data.startDate : false;
  const afterEnd = data ? today > data.endDate : false;

  const defaultPage = useMemo(() => {
    const idx = Math.min(nextIdx, Math.max(0, total - 1));
    return Math.min(Math.floor(idx / pageSize), pageCount - 1);
  }, [nextIdx, total, pageSize, pageCount]);

  // 首次加载/改周期后定位到"该看的那一页"
  useEffect(() => {
    if (!data) return;
    if (wantDefaultPage.current) {
      wantDefaultPage.current = false;
      setPage(defaultPage);
    }
  }, [data, pageSize, defaultPage]);

  useEffect(() => {
    setPage((p) => Math.min(p, pageCount - 1));
  }, [pageCount]);

  // 有翻页器时抬高页面底部内边距，避免最后一排被遮住
  useEffect(() => {
    document.body.classList.toggle('has-pager', pageCount > 1);
  }, [pageCount]);

  /* ---------------- 盖章动效 ---------------- */
  useEffect(() => {
    if (pendingPop == null) return;
    const cell = gridRef.current?.querySelector(`.cell[data-i="${pendingPop}"]`);
    if (cell) {
      splash(cell);
      cell.classList.add('shake');
      setTimeout(() => cell.classList.remove('shake'), 240);
      setTimeout(() => cell.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
    }
    const t = setTimeout(() => setPendingPop(null), 800);
    return () => clearTimeout(t);
  }, [pendingPop]);

  /* ---------------- 动作 ---------------- */
  async function stamp() {
    const idx = nextIdx;
    try {
      const next = await api.checkIn();
      setData(next);
      setPage(Math.floor(idx / pageSize));
      setPendingPop(idx);
      thud(soundOn);
      if (next.records.length >= next.totalDays) showToast('全部完成，恭喜');
    } catch (e) {
      showToast(e.message);
    }
  }

  async function cancel(date) {
    try {
      const next = await api.cancelCheckIn(date);
      setData(next);
      setViewing(null);
      showToast(`已取消 ${fmtKey(date)} 的打卡`);
    } catch (e) {
      setViewing(null);
      showToast(e.message);
    }
  }

  async function savePlan(plan) {
    try {
      const next = await api.savePlan(plan);
      wantDefaultPage.current = true;
      setData(next);
      setSettingsOpen(false);
      showToast('已保存');
    } catch (e) {
      showToast(e.message);
    }
  }

  async function clearAll() {
    if (!records.length) {
      showToast('还没有记录');
      return;
    }
    if (!window.confirm(`确定清空全部 ${records.length} 条打卡记录吗？此操作不可撤销。`)) return;
    try {
      const next = await api.clearAllCheckIns();
      setData(next);
      setSettingsOpen(false);
      showToast('记录已清空');
    } catch (e) {
      showToast(e.message);
    }
  }

  function onCellClick(i, record) {
    if (record) {
      setViewing({ date: record.date, index: i });
      return;
    }
    if (i === nextIdx) stamp();
    else if (i > nextIdx) showToast(`按顺序盖 · 现在是第 ${nextIdx + 1} 格`);
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    writeSoundPref(next);
    if (next) thud(true);
  }

  /* ---------------- 键盘 ---------------- */
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        setSettingsOpen(false);
        setViewing(null);
        return;
      }
      const tag = e.target?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') setPage((p) => Math.max(0, p - 1));
      if (e.key === 'ArrowRight') setPage((p) => Math.min(pageCount - 1, p + 1));
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pageCount]);

  /* ---------------- 页面 ---------------- */
  const from = Math.min(page * pageSize, Math.max(0, total));
  const to = Math.min(total, from + pageSize);

  if (loading && !data) {
    return (
      <div className="app">
        <div className="placeholder">正在连接后端…</div>
      </div>
    );
  }

  if (loadError && !data) {
    return (
      <div className="app">
        <div className="placeholder error">
          <p>{loadError}</p>
          <button className="btn gold" onClick={load}>
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SealDefs />

      <div className="app">
        <div className="header" ref={headerRef}>
          <div>
            <h1>{data.title}</h1>
            <p className="sub">
              {fmtKey(data.startDate)} — {fmtKey(data.endDate)} · 共 {total} 天
            </p>
          </div>
          <div className="tools">
            <button
              className={`icon${soundOn ? '' : ' off'}`}
              onClick={toggleSound}
              title={soundOn ? '音效：开' : '音效：关'}
              aria-label="音效开关"
            >
              {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
            </button>
            <button className="icon" onClick={() => setSettingsOpen(true)} title="设置" aria-label="设置">
              <GearIcon />
            </button>
          </div>
        </div>

        <div className="grid" ref={gridRef}>
          {Array.from({ length: Math.max(0, to - from) }, (_, k) => {
            const i = from + k;
            const record = records[i];
            const next = !record && i === nextIdx;
            return (
              <div
                key={i}
                className={`cell${record ? ' filled' : ''}${next ? ' next' : ''}`}
                data-i={i}
                onClick={() => onCellClick(i, record)}
              >
                {record ? (
                  <Seal date={record.date} index={i} total={total} pop={pendingPop === i} />
                ) : (
                  <span className="idx">{pad(i + 1)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className={`dock${pageCount > 1 ? ' has-pager' : ''}`}>
        {pageCount > 1 && (
          <div className="pager on">
            <button className="pg" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="上一页">
              ‹
            </button>
            <span className="pg-info">
              {page + 1} / {pageCount}
            </span>
            <button
              className="pg"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page === pageCount - 1}
              aria-label="下一页"
            >
              ›
            </button>
            {defaultPage !== page && (
              <button className="pg-today" onClick={() => setPage(defaultPage)}>
                当前进度
              </button>
            )}
          </div>
        )}

        <button className="primary" onClick={stamp} disabled={beforeStart || afterEnd || doneToday}>
          {beforeStart
            ? `打卡将在 ${fmtKey(data.startDate)} 开始`
            : afterEnd
              ? '打卡期已结束'
              : doneToday
                ? nextIdx >= total
                  ? '全部完成'
                  : '今天已打卡 · 明天见'
                : nextIdx === 0
                  ? '盖下第一枚章'
                  : '盖下今天的章'}
        </button>
      </div>

      {settingsOpen && (
        <SettingsSheet
          plan={data}
          onClose={() => setSettingsOpen(false)}
          onSave={savePlan}
          onClear={clearAll}
        />
      )}

      {viewing && (
        <SealDetail
          record={records[viewing.index] ?? { date: viewing.date }}
          index={viewing.index}
          total={total}
          onClose={() => setViewing(null)}
          onCancel={cancel}
        />
      )}

      <div className={`toast${toast ? ' on' : ''}`}>{toast}</div>
    </>
  );
}

/* ---------------- 小工具 ---------------- */

/** 墨点飞溅：临时 DOM 节点，动画结束即移除，不需要进入 React 状态 */
function splash(cell) {
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('i');
    p.className = 'splash';
    const angle = Math.random() * Math.PI * 2;
    const dist = 16 + Math.random() * 26;
    p.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
    p.style.animationDelay = `${(Math.random() * 0.05).toFixed(2)}s`;
    const size = `${(2 + Math.random() * 3).toFixed(1)}px`;
    p.style.width = size;
    p.style.height = size;
    cell.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 2.5l.6 2.1a7.7 7.7 0 0 1 2 .83l1.9-1.1 1.17 1.17-1.1 1.9a7.7 7.7 0 0 1 .83 2l2.1.6v1.6l-2.1.6a7.7 7.7 0 0 1-.83 2l1.1 1.9-1.17 1.17-1.9-1.1a7.7 7.7 0 0 1-2 .83L12 21.5h-1.6l-.6-2.1a7.7 7.7 0 0 1-2-.83l-1.9 1.1-1.17-1.17 1.1-1.9a7.7 7.7 0 0 1-.83-2l-2.1-.6v-1.6l2.1-.6a7.7 7.7 0 0 1 .83-2l-1.1-1.9L5.9 4.33l1.9 1.1a7.7 7.7 0 0 1 2-.83l.6-2.1H12z" transform="translate(1 0) scale(.98)" />
    </svg>
  );
}

function SoundOnIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.2v5.6h3.1L12 18.4V5.6L7.1 9.2H4z" />
      <path d="M15.6 9a4.2 4.2 0 0 1 0 6" />
      <path d="M18.2 6.4a8 8 0 0 1 0 11.2" />
    </svg>
  );
}

function SoundOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.2v5.6h3.1L12 18.4V5.6L7.1 9.2H4z" />
      <path d="M16 9.5l4.5 5M20.5 9.5L16 14.5" />
    </svg>
  );
}
