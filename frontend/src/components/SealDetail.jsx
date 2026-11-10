import { useState } from 'react';
import Seal from './Seal.jsx';
import { fmtChinese, fmtTime } from '../lib/date.js';

/**
 * 印章详情：放大看章、看真实打卡日期与时刻，并在这里取消打卡。
 * 取消是两步：先展开红色确认框，再点"确认取消"才真删。
 */
export default function SealDetail({ record, index, total, onClose, onCancel }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const time = fmtTime(record.at);

  async function doCancel() {
    if (busy) return;
    setBusy(true);
    try {
      await onCancel(record.date);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal on"
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        if (confirming) setConfirming(false);
        else onClose();
      }}
    >
      <div className="sheet view">
        <Seal date={record.date} index={index} total={total} big />

        <div className="view-date">{fmtChinese(record.date)}</div>
        <div className="view-sub">
          第 {index + 1} 天 · 共 {total} 天{time ? ` · ${time} 盖下` : ''}
        </div>

        {!confirming ? (
          <div className="row">
            <button className="btn" onClick={onClose}>
              关闭
            </button>
            <button className="btn danger" onClick={() => setConfirming(true)}>
              取消打卡
            </button>
          </div>
        ) : (
          <div className="confirm-box on">
            <p className="confirm-txt">
              确定要取消 <b>{fmtChinese(record.date).split(' · ')[0]}</b> 这次打卡吗？
              <br />
              这枚章会被移除，后面已盖的章依次前移一位（章上的日期不变）。此操作不可撤销。
            </p>
            <div className="row">
              <button className="btn" onClick={() => setConfirming(false)} disabled={busy}>
                再想想
              </button>
              <button className="btn danger solid" onClick={doCancel} disabled={busy}>
                {busy ? '取消中…' : '确认取消'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
