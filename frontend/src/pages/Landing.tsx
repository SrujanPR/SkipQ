import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, GraduationCap, Store, Smartphone, Shield, Users } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ── Counter ──
function AnimCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: target, duration: 2, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        onUpdate: () => { el.textContent = Math.round(obj.val) + suffix; },
      });
    });
    return () => ctx.revert();
  }, [target, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

export default function Landing() {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.ln-hero-title > *', { y: 50, opacity: 0, duration: 1, stagger: 0.12, delay: 0.2, ease: 'power3.out' });
      gsap.from('.ln-hero-sub', { y: 30, opacity: 0, duration: 0.8, delay: 0.9, ease: 'power3.out' });
      gsap.from('.ln-role-card', { y: 60, opacity: 0, duration: 0.9, stagger: 0.15, delay: 1.1, ease: 'power3.out' });
      gsap.from('.ln-hero-stats .ln-stat', { y: 20, opacity: 0, duration: 0.6, stagger: 0.1, delay: 1.5, ease: 'power3.out' });

      const stepCards = gsap.utils.toArray<HTMLElement>('.ln-step-card');
      stepCards.forEach((card, i) => {
        gsap.from(card, { scrollTrigger: { trigger: card, start: 'top 80%' }, y: 60, opacity: 0, duration: 0.9, delay: i * 0.1, ease: 'power3.out' });
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="ln-landing">
      {/* ═══ HERO ═══ */}
      <section className="ln-hero">
        <div className="ln-hero-bg">
          <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=80" alt="" />
        </div>

        <div className="ln-hero-inner">
          <div className="ln-hero-content">
            <div className="ln-hero-title">
              <span className="ln-hero-line1">Skip the Queue,</span>
              <span className="ln-hero-line2">Grab Your <em>Food.</em></span>
            </div>

            <p className="ln-hero-sub">
              Pre-order from your college canteen, pick a time slot,
              and walk straight to the counter. Your food, your schedule, zero wait time.
            </p>

            {!isAuthenticated ? (
              <div className="ln-role-picker">
                <Link to="/student/auth" className="ln-role-card ln-role-student">
                  <div className="ln-role-icon"><GraduationCap size={26} /></div>
                  <div className="ln-role-text">
                    <h3>I'm a Student</h3>
                    <p>Order food from your college canteens</p>
                  </div>
                  <ArrowRight size={18} className="ln-role-arrow" />
                </Link>
                <Link to="/canteen/auth" className="ln-role-card ln-role-canteen">
                  <div className="ln-role-icon"><Store size={26} /></div>
                  <div className="ln-role-text">
                    <h3>Partner</h3>
                    <p>Register & manage your canteens</p>
                  </div>
                  <ArrowRight size={18} className="ln-role-arrow" />
                </Link>
              </div>
            ) : (
              <div style={{ marginBottom: 48 }}>
                {user?.role === 'student' ? (
                  <Link to="/canteens" className="ln-btn-primary">Browse Canteens <ArrowRight size={18} /></Link>
                ) : user?.role === 'college_admin' ? (
                  <Link to="/admin/dashboard" className="ln-btn-primary">College Dashboard <ArrowRight size={18} /></Link>
                ) : (
                  <Link to="/staff/orders" className="ln-btn-primary">Staff Dashboard <ArrowRight size={18} /></Link>
                )}
              </div>
            )}

            <div className="ln-hero-stats">
              <div className="ln-stat">
                <span className="ln-stat-num"><AnimCounter target={500} suffix="+" /></span>
                <span className="ln-stat-label">Orders Served</span>
              </div>
              <div className="ln-stat-divider" />
              <div className="ln-stat">
                <span className="ln-stat-num"><AnimCounter target={15} suffix=" min" /></span>
                <span className="ln-stat-label">Avg. Saved</span>
              </div>
              <div className="ln-stat-divider" />
              <div className="ln-stat">
                <span className="ln-stat-num">4.8</span>
                <span className="ln-stat-label">User Rating</span>
              </div>
            </div>
          </div>

        </div>
      </section>


      {/* ═══ STEPS ═══ */}
      <section className="ln-steps">
        <span className="ln-section-label">For colleges</span>
        <h2 className="ln-section-title">Set up in <em>minutes.</em></h2>
        <div className="ln-steps-grid">
          {[
            { step: '01', icon: Shield, title: 'Register Your College', desc: 'Create your college admin account. You control everything from one dashboard.' },
            { step: '02', icon: Store, title: 'Add Your Canteens', desc: 'Set up multiple canteens — main mess, food court, juice bar. Each gets its own menu.' },
            { step: '03', icon: Users, title: 'Assign Staff Credentials', desc: 'Create login credentials for each canteen staff. They manage menus and orders independently.' },
            { step: '04', icon: Smartphone, title: 'Students Start Ordering', desc: 'Students at your college see all canteens, browse menus, and pre-order instantly.' },
          ].map(({ step, icon: Icon, title, desc }) => (
            <div key={step} className="ln-step-card">
              <span className="ln-step-num">{step}</span>
              <div className="ln-step-icon"><Icon size={24} /></div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="ln-footer">
        <div className="ln-footer-inner">
          <div className="ln-footer-brand"><img src="/logo.png" alt="SkipQ" className="logo-img" /><span>SkipQ</span></div>
          <div className="ln-footer-links">
            <Link to="/student/auth">Students</Link>
            <Link to="/canteen/auth">Colleges</Link>
          </div>
        </div>
        <div className="ln-footer-bottom">
          <p>Built for students, by students. Stop wasting your break in a queue.</p>
        </div>
      </footer>
    </div>
  );
}
