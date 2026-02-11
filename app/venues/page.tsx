'use client';
import Nav from '@/components/Nav';

export default function VenuesComingSoon() {
  return (
    <>
      <Nav />
      <div className="card">
        <h1>الملاعب</h1>
        <p className="small">
          قريباً… بنضيف خريطة ملاعب + أسعار + تقييمات + حجز.
        </p>

        <div className="card-soft">
          <p className="small" style={{ margin: 0 }}>
            🔔 أول إصدار: تحديد موقع الملعب في التحدّي.
          </p>
        </div>
      </div>
    </>
  );
}
