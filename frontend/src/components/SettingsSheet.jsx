import { useMemo, useState } from 'react';
import { diffDays, isKey } from '../lib/date.js';

/**
 * 设置面板：改打卡名称 + 起止日期。
 * 天数由日期差值实时算出（含头含尾），改动立刻反映在下方的"共 N 天"。
 */
export default function SettingsSheet({ plan, onClose, onSave, onClear }) {
  const [title, setTitle] = useState(plan.title);
  const [targetDate, setDate] = useState(plan.targetDate);
  const [start, setStart] = useState(plan.startDate);
  const [end, setEnd] = useState(plan.endDate);
  const [busy, setBusy] = useState(false);

  const days = useMemo(() => {
    if (!isKey(start) || !isKey(end)) return null;
    const n = diffDays(start, end) + 1;
    return n > 0 ? n : null;
  }, [start, end]);

  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      await onSave({ title, targetDate,startDate: start, endDate: end });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal on" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <h3>设置</h3>

        <div className="field">
          <label htmlFor="inTitle">打卡名称</label>
          <input
            id="inTitle"
            type="text"
            maxLength={16}
            value={title}
            placeholder="每日打卡"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="inDate">目标天数</label>
          <input
              id="inDate"
              type="number"
              maxLength={16}
              value={targetDate}
              placeholder="30"
              onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="inStart">启动时间</label>
            <input id="inStart" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="inEnd">结束时间</label>
            <input id="inEnd" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>

        <div className="span-line">
          共 <b>{days ?? '—'}</b> 天 · 每天可盖一枚章
        </div>

        <div className="row">
          <button className="btn danger" onClick={onClear} disabled={busy}>
            清空记录
          </button>
          <button className="btn gold" onClick={submit} disabled={busy}>
            {busy ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
