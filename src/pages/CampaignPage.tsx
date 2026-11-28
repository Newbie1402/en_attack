import { Link } from 'react-router-dom';

import { readSave } from '../game/application/save';

const levels = [
  { id: 'L1', title: 'Chuyến bay đầu tiên', theme: 'Vườn xuân' },
  { id: 'L2', title: 'Tổ may mắn', theme: 'Vườn xuân' },
  { id: 'L3', title: 'Vòng qua tảng đá', theme: 'Vườn xuân' },
  { id: 'L4', title: 'Đường mòn băng giá', theme: 'Thung lũng đông' },
  { id: 'L5', title: 'Nghĩ khác đi', theme: 'Thung lũng đông' },
  { id: 'L6', title: 'Hộ vệ băng giá', theme: 'Thung lũng đông' },
];

export function CampaignPage(): React.JSX.Element {
  const save = readSave();
  return (
    <section className="content-wrap campaign-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Chương 1 · Vườn xuân</p>
          <h1>Hành trình của én tuyết</h1>
        </div>
        <span className="chapter-badge">1 / 6 chương</span>
      </div>
      <div className="journey-line" aria-label="Các màn chơi trong chiến dịch">
        {levels.map((level, index) => (
          <article
            className={
              save.unlockedLevels.includes(level.id) ? 'level-node unlocked' : 'level-node locked'
            }
            key={level.id}
          >
            <div className="node-orb">
              {save.unlockedLevels.includes(level.id) ? level.id : '⋯'}
            </div>
            <div>
              <p className="node-theme">{level.theme}</p>
              <h2>{level.title}</h2>
              {save.unlockedLevels.includes(level.id) ? (
                <Link className="text-link" to={`/play/${level.id}`}>
                  {save.wonLevels.includes(level.id) ? 'Chơi lại →' : 'Vào màn chơi →'}
                </Link>
              ) : (
                <span className="locked-label">Mở khóa sau khi chiến thắng</span>
              )}
            </div>
            {index < levels.length - 1 && <span className="journey-connector" aria-hidden="true" />}
          </article>
        ))}
      </div>
    </section>
  );
}
