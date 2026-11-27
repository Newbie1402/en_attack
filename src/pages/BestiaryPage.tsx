const entries = [
  { name: 'Cáo tuyết', kind: 'fox', detail: 'Kẻ địch cơ bản, đi thẳng theo làn.' },
  { name: 'Lợn đá', kind: 'boar', detail: 'Chậm nhưng nhiều máu, ép bạn đổi góc bắn.' },
  { name: 'Quạ băng', kind: 'raven', detail: 'Nhanh và có thể đổi làn khi bị đe dọa.' },
  { name: 'Hộ vệ băng giá', kind: 'guardian', detail: 'Boss sáu, đổi pha ở 70% và 30% máu.' },
];

export function BestiaryPage(): React.JSX.Element {
  return (
    <section className="content-wrap bestiary-page">
      <p className="eyebrow">Bách khoa · Dữ liệu đã gặp</p>
      <h1>Sổ tay khu vườn</h1>
      <div className="bestiary-grid">
        {entries.map((entry) => (
          <article className={`bestiary-card ${entry.kind}`} key={entry.kind}>
            <span className="bestiary-mark" aria-hidden="true">
              ●
            </span>
            <h2>{entry.name}</h2>
            <p>{entry.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
