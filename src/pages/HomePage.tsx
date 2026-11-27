import { Link } from 'react-router-dom';

export function HomePage(): React.JSX.Element {
  return (
    <section className="home-page content-wrap">
      <div className="hero-copy">
        <p className="eyebrow">Mùa xuân · Chuyến bay đầu tiên</p>
        <h1>Bảo vệ tổ chim bằng những đường cong tuyết.</h1>
        <p className="lede">
          Nhập một công thức, phóng tuyết cầu theo đúng đồ thị và giữ khu vườn bình yên trước bầy
          cáo tuyết.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" to="/play/L1">
            Bắt đầu bay
          </Link>
          <Link className="button button-secondary" to="/campaign">
            Xem hành trình
          </Link>
        </div>
      </div>
      <div className="hero-art" aria-label="Minh họa chim én phi công và khu vườn mùa xuân">
        <div className="sun-orb" />
        <div className="cloud cloud-one" />
        <div className="cloud cloud-two" />
        <div className="garden-hill hill-back" />
        <div className="garden-hill hill-front" />
        <div className="pilot-bird" aria-hidden="true">
          <span className="pilot-cap" />
          <span className="bird-eye" />
          <span className="bird-beak" />
          <span className="bird-wing wing-left" />
          <span className="bird-wing wing-right" />
          <span className="bird-scarf" />
          <span className="bird-tail" />
        </div>
        <span className="flight-spark spark-one">✦</span>
        <span className="flight-spark spark-two">✧</span>
      </div>
    </section>
  );
}
