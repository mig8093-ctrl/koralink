import Nav from '@/components/Nav';

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="badge">{children}</span>;
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="card card-soft" style={{ margin: 0, padding: 18, flex: '1 1 260px' }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          display: 'grid',
          placeItems: 'center',
          border: '1px solid rgba(57,255,136,0.18)',
          background: 'linear-gradient(135deg, rgba(57,255,136,0.16), rgba(0,214,255,0.06))',
          marginBottom: 12,
          fontSize: 20,
        }}
      >
        {icon}
      </div>
      <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
      <p className="small" style={{ margin: '8px 0 0' }}>{desc}</p>
    </div>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="card card-soft" style={{ margin: 0, padding: 18, flex: '1 1 260px' }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          display: 'grid',
          placeItems: 'center',
          border: '1px solid rgba(57,255,136,0.16)',
          background: 'rgba(10,28,16,0.45)',
          fontWeight: 1000,
          marginBottom: 10,
        }}
      >
        {n}
      </div>
      <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
      <p className="small" style={{ margin: '8px 0 0' }}>{desc}</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <Nav />

      {/* HERO */}
      <div className="card" style={{ width: 'min(980px, calc(100% - 32px))', padding: 22, marginTop: 26 }}>
        <div className="row" style={{ gap: 8, marginBottom: 12 }}>
          <Pill>⚽ خماسي</Pill>
          <Pill>🧤 5 + حارس</Pill>
          <Pill>🔒 خصوصية الرقم</Pill>
        </div>

        <h1 className="neon-text" style={{ fontSize: 30, lineHeight: 1.2, marginBottom: 8 }}>
          كوّن فريقك… وخَلّي التحدي يشتعل
        </h1>

        <p className="small" style={{ maxWidth: 720 }}>
          <b>KoraLink</b> يسهل عليك تنظيم مباريات الخماسي: أنشئ فريق، أضف لاعبين بالـ <b>Player ID</b>،
          وابعت تحدي لفريق ثاني وحدد الوقت والمكان — بدون قروبات وفوضى.
        </p>

        <div style={{ height: 12 }} />
        <div className="row" style={{ alignItems: 'center' }}>
          <a className="btn" href="/login">ابدأ بتسجيل الدخول</a>
          <a className="btn secondary" href="/teams">استعرض الفرق</a>
        </div>

        <p className="small" style={{ marginTop: 12 }}>
          👑 الكابتن لازم رقمّه <b>ظاهر</b> لتنسيق أسرع — باقي اللاعبين يقدروا يخفوه.
        </p>
      </div>

      {/* FEATURES */}
      <div style={{ width: 'min(980px, calc(100% - 32px))', margin: '18px auto 0' }}>
        <div className="row" style={{ marginBottom: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0 }}>ليش KoraLink؟</h2>
            <p className="small" style={{ margin: '6px 0 0' }}>
              كل شيء محسوب للخماسي: فرق، لاعبين، دعوات، وتحديات… بواجهة واضحة وبسيطة.
            </p>
          </div>
        </div>

        <div className="row">
          <Feature
            icon="🆔"
            title="دعوة عبر Player ID"
            desc="الكابتن يضيف اللاعبين بسهولة: يدخل الـID، يجيلك طلب على هاتفك، وتقبله بضغطة."
          />
          <Feature
            icon="👥"
            title="انضم حتى 3 فرق"
            desc="تلعب مع أكثر من قروب؟ تمام. تقدر تكون عضو في 3 فرق كحد أقصى بدون لخبطه."
          />
          <Feature
            icon="⚔️"
            title="تحدي فرق أخرى"
            desc="ابعت تحدي وحدد المدينة/المستوى — وتكون الحالات واضحة: Pending / Accepted."
          />
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{ width: 'min(980px, calc(100% - 32px))', margin: '18px auto 28px' }}>
        <div className="card" style={{ margin: 0, padding: 20 }}>
          <h2 style={{ margin: 0 }}>كيف تشتغل؟</h2>
          <p className="small" style={{ marginTop: 6 }}>ثلاث خطوات وتبدأ اللعب.</p>

          <div style={{ height: 12 }} />
          <div className="row">
            <Step n="1" title="سجّل دخول" desc="سجل بـ Google وكمّل ملفك: الاسم، المدينة، المركز، والمستوى." />
            <Step n="2" title="كوّن فريقك" desc="أنشئ فريق خماسي وأضف لاعبين بدعوة عبر الـPlayer ID." />
            <Step n="3" title="ابعت تحدي" desc="حدد خصم وموعد ومكان — والكابتن يتواصل بسهولة لأن رقمه ظاهر." />
          </div>

          <div style={{ height: 12 }} />
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <p className="small" style={{ margin: 0 }}>جاهز؟ خَلّي أول فريق يتكوّن اليوم.</p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <a className="btn" href="/login">ابدأ الآن</a>
              <a className="btn secondary" href="/teams">شوف الفرق</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
