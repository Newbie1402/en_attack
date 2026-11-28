const entries = [
  { name: 'Cáo tuyết', kind: 'fox', detail: 'Kẻ địch cơ bản, đi thẳng theo làn.' },
  { name: 'Lợn đá', kind: 'boar', detail: 'Chậm nhưng nhiều máu, ép bạn đổi góc bắn.' },
  { name: 'Quạ băng', kind: 'raven', detail: 'Nhanh và có thể đổi làn khi bị đe dọa.' },
  {
    name: 'Kẻ nhảy tường',
    kind: 'wall-jumper',
    detail: 'Nhảy qua vật cản một lần, đổi làn giữa cú bật và né đường bay thẳng.',
  },
  {
    name: 'Vệ binh băng',
    kind: 'ice-guard',
    detail: 'Mang khiên pha lê và chỉ bị chậm nhẹ khi Đóng băng tác động.',
  },
  { name: 'Hộ vệ băng giá', kind: 'guardian', detail: 'Boss sáu, đổi pha ở 70% và 30% máu.' },
  {
    name: 'Én khiên',
    kind: 'shield',
    detail: 'Chặn một lần kẻ địch thủng cùng làn rồi hồi khiên.',
  },
  {
    name: 'Én lửa',
    kind: 'fire',
    detail: 'Đốt mục tiêu sau va chạm, gây sát thương theo thời gian.',
  },
  { name: 'Én phù thủy', kind: 'witch', detail: 'Gắn lời nguyền khiến các đòn sau đau hơn.' },
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
