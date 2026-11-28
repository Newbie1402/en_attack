interface SimplePageProps {
  readonly title: string;
}

export function SimplePage({ title }: SimplePageProps): React.JSX.Element {
  return (
    <section className="content-wrap placeholder-page">
      <p className="eyebrow">SnowGraph</p>
      <h1>{title}</h1>
      <p>Nội dung này sẽ dùng chung engine mô phỏng và bảng điều khiển của trận đấu.</p>
    </section>
  );
}
