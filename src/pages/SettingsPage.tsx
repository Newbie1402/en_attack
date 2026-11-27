import { useState } from 'react';

import { readSave, writeSave } from '../game/application/save';

export function SettingsPage(): React.JSX.Element {
  const [save, setSave] = useState(readSave);
  const update = (change: Partial<typeof save>) => {
    const next = { ...save, ...change };
    setSave(next);
    writeSave(next);
  };

  return (
    <section className="content-wrap settings-page">
      <p className="eyebrow">SnowGraph · Tùy chọn</p>
      <h1>Cài đặt chuyến bay</h1>
      <div className="settings-card">
        <label>
          Ngôn ngữ
          <select
            value={save.language}
            onChange={(event) => update({ language: event.target.value === 'en' ? 'en' : 'vi' })}
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English (beta)</option>
          </select>
        </label>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={save.muted}
            onChange={(event) => update({ muted: event.target.checked })}
          />
          Tắt âm thanh
        </label>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={save.reducedMotion}
            onChange={(event) => update({ reducedMotion: event.target.checked })}
          />
          Giảm chuyển động
        </label>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={save.hints}
            onChange={(event) => update({ hints: event.target.checked })}
          />
          Hiện gợi ý công thức
        </label>
      </div>
      <p className="muted-note">
        Tiến trình chỉ lưu trên thiết bị này. Dữ liệu hỏng sẽ tự trở về mặc định an toàn.
      </p>
    </section>
  );
}
