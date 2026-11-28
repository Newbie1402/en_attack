import { useMemo, useState } from 'react';

import { sampleTrajectory } from '../game/domain/math/sampler';
import { validateFormula } from '../game/domain/math/engine';

export function SandboxPage(): React.JSX.Element {
  const [formula, setFormula] = useState('0.5x');
  const result = useMemo(() => validateFormula(formula), [formula]);
  const path = result.ok
    ? sampleTrajectory(result.formula.expression, { maxU: 8, minV: -4, maxV: 4 })
    : null;
  const points = path?.points ?? [];

  return (
    <section className="content-wrap sandbox-page">
      <p className="eyebrow">Phòng thí nghiệm · Không ảnh hưởng chiến dịch</p>
      <h1>Thử đường bay</h1>
      <p className="lede">
        Mọi công thức ở đây đi qua gốc (0, 0) và dùng đúng parser, sampler của trận đấu.
      </p>
      <div className="lab-card">
        <label htmlFor="sandbox-formula">y = f(x)</label>
        <input
          id="sandbox-formula"
          value={formula}
          onChange={(event) => setFormula(event.target.value)}
        />
        <span className={result.ok ? 'valid-note' : 'error-note'} role="status">
          {result.ok
            ? `Hợp lệ · ${points.length} điểm mẫu`
            : 'Công thức không hợp lệ hoặc vượt giới hạn.'}
        </span>
        <div className="lab-preview" aria-label="Xem trước đường bay">
          {points.length > 1 && (
            <svg viewBox="0 0 320 180" role="img" aria-label="Đường bay mẫu">
              <path
                d={points
                  .map(
                    (point, index) =>
                      `${index === 0 ? 'M' : 'L'} ${20 + point.x * 32} ${90 - point.y * 18}`,
                  )
                  .join(' ')}
                fill="none"
                stroke="#f97316"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
      </div>
    </section>
  );
}
