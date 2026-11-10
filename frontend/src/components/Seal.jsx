import { pad } from '../lib/date.js';

/**
 * 印章图形：外圈环排日期（上弧）、DAY xx / xx（下弧），中心对勾。
 * 墨迹毛边靠 filter #inkRough（同滤镜共用于所有章，定义在 <SealDefs/>）。
 */
export default function Seal({ date, index, total, pop = false, big = false }) {
  const [y, m, d] = date.split('-');
  const upper = `${y} · ${m} · ${d}`;
  const lower = `DAY ${pad(index + 1)} / ${pad(total)}`;
  // 每枚章角度略有差异，像手一枚枚盖上去的
  const rot = ((index * 37) % 13) - 6;

  return (
    <div className={`seal${pop ? ' pop' : ''}${big ? ' big' : ''}`}>
      <svg
        className="seal-svg"
        viewBox="0 0 200 200"
        style={{ '--rot': `${rot}deg` }}
        role="img"
        aria-label={`${date} 第 ${index + 1} 枚章`}
      >
        <g filter="url(#inkRough)" fill="none" stroke="currentColor">
          <circle cx="100" cy="100" r="92" strokeWidth="5" />
          <circle cx="100" cy="100" r="83" strokeWidth="1.1" opacity=".45" />
          <circle cx="100" cy="100" r="56" strokeWidth="1.6" opacity=".85" />
        </g>
        <text fontSize="20" fill="currentColor" letterSpacing="0.8">
          <textPath href="#arcTop" startOffset="50%" textAnchor="middle">
            {upper}
          </textPath>
        </text>
        <text fontSize="15" fill="currentColor" letterSpacing="3.6" opacity=".9">
          <textPath href="#arcBot" startOffset="50%" textAnchor="middle">
            {lower}
          </textPath>
        </text>
        <path
          filter="url(#inkRough)"
          d="M72 104 L92 124 L132 80"
          fill="none"
          stroke="currentColor"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/** 全局唯一一份 SVG defs：弧线路径 + 墨迹毛边滤镜。 */
export function SealDefs() {
  return (
    <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        {/* 上弧：从左到右 sweep=1，文字正立 */}
        <path id="arcTop" d="M 26 100 A 74 74 0 0 1 174 100" />
        {/* 下弧：必须 sweep=0，否则文字整体倒立 */}
        <path id="arcBot" d="M 26 100 A 74 74 0 0 0 174 100" />
        <filter id="inkRough" x="-18%" y="-18%" width="136%" height="136%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.38" numOctaves="3" seed="9" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
