import React from 'react';
import LoginForm from '../../Components/LoginForm';
import './Login.css';
import loginHero from '../../assets/laundry_login_hero.png';

const Login = () => {
  // Generate random sizes and left coordinates for background laundry bubbles
  const bubbles = [
    { size: '20px', left: '10%', delay: '0s', duration: '14s' },
    { size: '40px', left: '25%', delay: '2s', duration: '18s' },
    { size: '15px', left: '40%', delay: '1s', duration: '12s' },
    { size: '30px', left: '55%', delay: '4s', duration: '16s' },
    { size: '25px', left: '70%', delay: '0s', duration: '15s' },
    { size: '50px', left: '85%', delay: '3s', duration: '20s' },
    { size: '18px', left: '95%', delay: '5s', duration: '13s' },
    { size: '35px', left: '15%', delay: '6s', duration: '17s' },
  ];

  return (
    <div className="login-page-wrapper">
      {/* Dynamic Animated Blobs in the background */}
      <div className="bg-glow-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {/* Floating bubbles rising behind the login card */}
      <div className="bubbles-container">
        {bubbles.map((bubble, i) => (
          <div
            key={i}
            className="bubble"
            style={{
              width: bubble.size,
              height: bubble.size,
              left: bubble.left,
              animationDelay: bubble.delay,
              animationDuration: bubble.duration,
            }}
          ></div>
        ))}
      </div>

      {/* Main Centered Login Card Container */}
      <div className="login-card-container">
        <div className="login-split-card">
          
          {/* Left Side: Side Image Panel inside the card */}
          <div className="card-image-side">
            <div className="side-image-overlay"></div>
            <img src={loginHero} alt="Laundry Operations Hero" className="side-bg-image" />
            
            <div className="side-hero-content">
              {/* Brand Header */}
              <div className="side-brand">
                <div className="side-logo-box">
                  <svg
                    className="side-logo-svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                    <circle cx="12" cy="13" r="5" />
                    <line x1="7" y1="7" x2="7" y2="7" strokeWidth="3" />
                    <line x1="11" y1="7" x2="11" y2="7" strokeWidth="3" />
                    <line x1="15" y1="7" x2="17" y2="7" strokeWidth="2" />
                    <path d="M11 11.5c.5-.5 1-.5 1.5 0s1 .5 1.5 0" strokeWidth="1.5" />
                  </svg>
                </div>
                <div className="side-brand-text">
                  <h2 className="side-brand-name">Tuhama <span>PRO</span></h2>
                  <p className="side-brand-tagline">Enterprise Operations Suite</p>
                </div>
              </div>

              {/* Side visual promo details */}
              <div className="side-promo-details">
                <h3 className="side-promo-title">Optimizing Commercial Laundry</h3>
                <p className="side-promo-desc">
                  Cloud operations for processing, real-time routing, customer management, and counter desk ticketing.
                </p>
                <div className="side-bullet-points">
                  <div className="bullet-point">
                    <span className="bullet-dot"></span>
                    <span>Intelligent Dispatch Rider Tracking</span>
                  </div>
                  <div className="bullet-point">
                    <span className="bullet-dot"></span>
                    <span>Walk-In Counter Operations Hub</span>
                  </div>
                  <div className="bullet-point">
                    <span className="bullet-dot"></span>
                    <span>Role-based Staff Authentication</span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="side-hero-footer">
                <p>&copy; {new Date().getFullYear()} Tuhama Operations Inc.</p>
              </div>
            </div>
          </div>

          {/* Right Side: Form Panel inside the card */}
          <div className="card-form-side">
            <div className="card-form-content">
              {/* Brand Header for Mobile View (Hidden when side image is visible) */}
              <div className="mobile-card-brand">
                <div className="logo-wrapper">
                  <svg
                    className="logo-svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                    <circle cx="12" cy="13" r="5" />
                    <line x1="7" y1="7" x2="7" y2="7" strokeWidth="3" />
                    <line x1="11" y1="7" x2="11" y2="7" strokeWidth="3" />
                    <line x1="15" y1="7" x2="17" y2="7" strokeWidth="2" />
                    <path d="M11 11.5c.5-.5 1-.5 1.5 0s1 .5 1.5 0" strokeWidth="1.5" />
                  </svg>
                </div>
                <h2 className="brand-title">Tuhama PRO</h2>
                <p className="brand-subtitle">Enterprise Laundry Suite</p>
              </div>

              {/* Login Title */}
              <div className="form-header-title">
                <h2 className="form-title">Welcome Back</h2>
                <p className="form-subtitle">Please login to your account</p>
              </div>

              {/* Login Form Component */}
              <LoginForm />

              {/* Mobile-only footer */}
              <footer className="mobile-form-footer">
                <p>&copy; {new Date().getFullYear()} Tuhama Operations Inc.</p>
                <p>v2.4.0 • Authorized Personnel Only</p>
              </footer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
