import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Lock, Mail, Eye, EyeOff, UserPlus, LogIn, Hash, Building2, User } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
  const [loginType, setLoginType] = useState('staff'); // 'staff' or 'employee'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, employeeLogin, signup, employeeSignup } = useAuth();
  const navigate = useNavigate();

  const resetForm = () => {
    setEmail(''); setPassword(''); setConfirmPassword(''); setEmployeeId('');
    setError(''); setSuccess('');
    setShowPw(false); setShowConfirmPw(false);
  };

  const switchMode = (newMode) => {
    resetForm();
    setMode(newMode);
  };

  const switchLoginType = (type) => {
    resetForm();
    setLoginType(type);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    await new Promise(r => setTimeout(r, 600));

    let res;
    if (loginType === 'employee') {
      res = await employeeLogin(employeeId, email, password);
    } else {
      res = await login(email, password);
    }
    setLoading(false);
    if (res.success) navigate(`/${res.user.role}`);
    else setError(res.error);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);

    if (password.length < 6) {
      setLoading(false);
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setLoading(false);
      setError('Passwords do not match.');
      return;
    }

    await new Promise(r => setTimeout(r, 600));

    let res;
    if (loginType === 'employee') {
      if (!employeeId.trim()) {
        setLoading(false);
        setError('Employee ID is required.');
        return;
      }
      res = await employeeSignup(employeeId, email, password);
    } else {
      res = await signup(email, password);
    }
    setLoading(false);
    if (res.success) {
      navigate(`/${res.user.role}`);
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card slide-up">
        <div className="login-logo">
          <div className="logo-icon"><svg width="24" height="24" viewBox="0 0 32 32" fill="none"><path d="M8 22V10l8 6-8 6z" fill="white"/><path d="M16 22V10l8 6-8 6z" fill="white" opacity="0.6"/></svg></div>
          <h1>Mavericks Inventory</h1>
        </div>

        {/* Login Type Toggle */}
        <div className="login-type-toggle">
          <button
            className={`login-type-btn ${loginType === 'staff' ? 'login-type-active' : ''}`}
            onClick={() => switchLoginType('staff')}
            type="button"
          >
            <Building2 size={15} />
            Staff
          </button>
          <button
            className={`login-type-btn ${loginType === 'employee' ? 'login-type-active' : ''}`}
            onClick={() => switchLoginType('employee')}
            type="button"
          >
            <User size={15} />
            Employee
          </button>
        </div>

        {/* Tab switcher */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'signin' ? 'auth-tab-active' : ''}`}
            onClick={() => switchMode('signin')}
            type="button"
          >
            <LogIn size={16} />
            Sign In
          </button>
          <button
            className={`auth-tab ${mode === 'signup' ? 'auth-tab-active' : ''}`}
            onClick={() => switchMode('signup')}
            type="button"
          >
            <UserPlus size={16} />
            Sign Up
          </button>
        </div>

        {mode === 'signin' ? (
          <form onSubmit={handleSignIn} key="signin">
            {loginType === 'employee' && (
              <div className="form-group">
                <label className="form-label">Employee ID</label>
                <div style={{ position: 'relative' }}>
                  <Hash size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                  <input className="form-input" type="text" placeholder="Enter your Employee ID" value={employeeId} onChange={e => setEmployeeId(e.target.value)} style={{ paddingLeft: 40 }} required />
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input className="form-input" type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} style={{ paddingLeft: 40 }} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input className="form-input" type={showPw ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingLeft: 40, paddingRight: 40 }} required />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}
            {success && <div className="form-success" style={{ marginBottom: 12 }}>{success}</div>}
            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} style={{ justifyContent: 'center' }}>
              {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></span> : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} key="signup">
            <div className="signup-info">
              <p>{loginType === 'employee' ? 'Set your password using your Employee ID and registered email.' : 'Set your password for your admin-registered account.'}</p>
            </div>
            {loginType === 'employee' && (
              <div className="form-group">
                <label className="form-label">Employee ID</label>
                <div style={{ position: 'relative' }}>
                  <Hash size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                  <input className="form-input" type="text" placeholder="Enter your Employee ID" value={employeeId} onChange={e => setEmployeeId(e.target.value)} style={{ paddingLeft: 40 }} required />
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input className="form-input" type="email" placeholder="Enter your registered email" value={email} onChange={e => setEmail(e.target.value)} style={{ paddingLeft: 40 }} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Set Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input className="form-input" type={showPw ? 'text' : 'password'} placeholder="Create a password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingLeft: 40, paddingRight: 40 }} required minLength={6} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input className="form-input" type={showConfirmPw ? 'text' : 'password'} placeholder="Confirm your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ paddingLeft: 40, paddingRight: 40 }} required minLength={6} />
                <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>
                  {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}
            {success && <div className="form-success" style={{ marginBottom: 12 }}>{success}</div>}
            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} style={{ justifyContent: 'center' }}>
              {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></span> : 'Sign Up'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
