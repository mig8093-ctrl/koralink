'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type FAQ = { q: string; a: string };

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  // تفاعل بسيط: FAQ accordion
  const faqs: FAQ[] = useMemo(() => ([
    {
      q: 'شن الفكرة من KoraLink؟',
      a: 'تنظيم مباريات الخماسي بسهولة: فرق، دعوات بالـ Player ID، تحديات، تحديد موقع الملعب، وتقييم + بلاغات.'
    },
    {
      q: 'هل نقدر نلعب بدون فريق؟',
      a: 'إيه، تقدر تكون “Free Agent” في السوق وتستقبل عروض من كباتن فرق محتاجين لاعب.'
    },
    {
      q: 'شن يعني Player ID؟',
      a: 'رقم/رمز خاص فيك تعطيه لصحابك باش يضيفوك للفريق بسرعة بدون بحث طويل.'
    },
    {
      q: 'هل في قروبات وفوضى؟',
      a: 'لا. التواصل يكون منظم داخل التطبيق حسب الدعوات والتحديات فقط.'
    },
  ]), []);

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      setChecking(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) alert(error.message);
  }

  if (checking) {
    return (
      <div className="card">
        <h1>تحميل…</h1>
        <p className="small">لحظات</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ width: 'min(980px, 100%)' }}>
      {/* HERO */}
      <div className="row" style={{ alignItems: 'stretch' }}>
        <div style={{ flex: '1 1 420px', minWidth: 280 }}>
          <div className="badge" style={{ marginBottom: 10 }}>⚽ مباريات الخماسي • 5 + حارس</div>

          <h1 style={{ fontSize: 34, lineHeight: 1.15 }}>
            نظّم لعبتك… <span className="neon-text">بكل سهولة</span>
          </h1>

          <p className="small" style={{ fontSize: 14 }}>
            KoraLink يلمّ الشلّة ويفكك من القروبات: فريقك، لاعبينك، وتحدّياتك… كلّه في مكان واحد.
          </p>

          <div className="row" style={{ marginTop: 14 }}>
            {!signedIn ? (
              <button className="btn" onClick={signInWithGoogle} disabled={loading}>
                {loading ? '...' : 'متابعة عبر Google'}
              </button>
            ) : (
              <Link className="btn secondary" href="/teams">دخول للبرنامج</Link>
            )}

            <a className="btn secondary" href="#how">كيف تشتغل؟</a>
          </div>

          <p className="small" style={{ marginTop: 10 }}>
            ✅ بدون فوضى • ✅ دعوات بالـID • ✅ تحديد موقع الملعب • ✅ تقييم وبلاغات
          </p>
        </div>

        {/* PREVIEW CARD */}
        <div className="card-soft" style={{ flex: '1 1 420px', minWidth: 280 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b>Preview</b>
          </div>

          <div style={{ height: 12 }} />

          <div className="card-soft" style={{ padding: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="badge">فريق: النصر الخماسي</span>
              <span className="badge">Tripoli</span>
            </div>
            <div style={{ height: 10 }} />
            <div className="row">
              <span className="badge">⚔️ تحدّي</span>
              <span className="badge">🗺️ موقع الملعب</span>
              <span className="badge">⭐ تقييم</span>
            </div>
            <div style={{ height: 10 }} />
            <p className="small" style={{ margin: 0 }}>
              “نحتاج حارس اليوم” → يطلعلك في السوق، والكابتن يرسل دعوة بالـPlayer ID.
            </p>
          </div>

          <div style={{ height: 12 }} />

          <div className="row">
            <div className="card-soft" style={{ flex: 1, padding: 12 }}>
              <div className="small">Player ID</div>
              <b style={{ letterSpacing: 1 }}>PL-7QK2M9</b>
            </div>
            <div className="card-soft" style={{ flex: 1, padding: 12 }}>
              <div className="small">مستوى الفريق</div>
              <b>متوسط ⭐⭐⭐</b>
            </div>
          </div>
        </div>
      </div>

      <hr />

      {/* FEATURES */}
      <h2>شن يميّز KoraLink؟</h2>
      <div className="grid" style={{ marginTop: 10 }}>
        <div className="card-soft">
          <b>👥 فرق ودعوات بالـID</b>
          <p className="small" style={{ margin: '6px 0 0' }}>
            الكابتن يضيف صحابه بالـPlayer ID، واللاعب يقبل… وخلاص.
          </p>
        </div>

        <div className="card-soft">
          <b>⚔️ تحدّي منظم</b>
          <p className="small" style={{ margin: '6px 0 0' }}>
            اتفقوا على الوقت والمكان داخل التحدّي بدل الرغي.
          </p>
        </div>

        <div className="card-soft">
          <b>🗺️ تحديد موقع الملعب</b>
          <p className="small" style={{ margin: '6px 0 0' }}>
            حط رابط Google Maps في التحدّي والكل يمشي للمكان صح.
          </p>
        </div>

        <div className="card-soft">
          <b>⭐ تقييم + 🚨 بلاغات</b>
          <p className="small" style={{ margin: '6px 0 0' }}>
            قيّموا الفرق… ولو في فريق يخرب اللعب، البلاغات تنظم المجتمع.
          </p>
        </div>
      </div>

      <hr />

      {/* HOW IT WORKS */}
      <div id="how" />
      <h2>كيف تشتغل؟ (3 خطوات)</h2>

      <div className="row" style={{ marginTop: 10 }}>
        <div className="card-soft" style={{ flex: '1 1 260px' }}>
          <div className="badge">1</div>
          <b style={{ display: 'block', marginTop: 6 }}>سجّل بـ Google</b>
          <p className="small" style={{ margin: '6px 0 0' }}>
            أول مرة تكمل ملفك: مدينة + منطقة + مركز + مستوى.
          </p>
        </div>

        <div className="card-soft" style={{ flex: '1 1 260px' }}>
          <div className="badge">2</div>
          <b style={{ display: 'block', marginTop: 6 }}>كوّن فريقك</b>
          <p className="small" style={{ margin: '6px 0 0' }}>
            ضيف لاعبين بالـPlayer ID… كل لاعب يقبل من تلفونه.
          </p>
        </div>

        <div className="card-soft" style={{ flex: '1 1 260px' }}>
          <div className="badge">3</div>
          <b style={{ display: 'block', marginTop: 6 }}>تحدّى وحدد المكان</b>
          <p className="small" style={{ margin: '6px 0 0' }}>
            افتح تحدّي، حط رابط الملعب، وبعدها قيّموا التجربة.
          </p>
        </div>
      </div>

      <hr />

      {/* FAQ */}
      <h2>أسئلة سريعة</h2>
      <div style={{ marginTop: 10 }}>
        {faqs.map((f, i) => {
          const open = openFaq === i;
          return (
            <div key={i} className="card-soft" style={{ marginBottom: 10 }}>
              <button
                className="btn secondary sm"
                style={{ width: '100%', justifyContent: 'space-between' }}
                onClick={() => setOpenFaq(open ? null : i)}
              >
                <span>{f.q}</span>
                <span className="badge">{open ? '−' : '+'}</span>
              </button>

              {open && (
                <p className="small" style={{ marginTop: 10 }}>
                  {f.a}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <hr />

      {/* FOOTER CTA */}
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <p className="small" style={{ margin: 0 }}>
          جاهز؟ خلّينا نبدأ بتنظيم أول مباراة بطريقة محترمة.
        </p>

        {!signedIn ? (
          <button className="btn sm" onClick={signInWithGoogle} disabled={loading}>
            {loading ? '...' : 'تسجيل الدخول'}
          </button>
        ) : (
          <Link className="btn sm secondary" href="/teams">دخول للبرنامج</Link>
        )}
      </div>
    </div>
  );
}
