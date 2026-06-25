import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiEye, FiEyeOff, FiLoader, FiAlertCircle, FiCheck, FiArrowRight, FiMapPin } from 'react-icons/fi';
import { mockStaff } from '../data/mockData';

const defaultBranches = [
  { id: 1, name: 'Ragheey' },
  { id: 2, name: 'Mishrif' },
  { id: 3, name: 'Andalus' },
  { id: 4, name: 'Ardiya' },
  { id: 5, name: 'Khaitan' },
  { id: 6, name: 'Qurain' },
  { id: 7, name: 'Jahra' },
  { id: 8, name: 'Rigai' },
];

const LoginForm = () => {
  const navigate = useNavigate();

  // State variables
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState(1);

  // Load branches
  const savedBranchesStr = localStorage.getItem('branches_list');
  let branchesList = defaultBranches;
  if (savedBranchesStr) {
    try {
      branchesList = JSON.parse(savedBranchesStr);
    } catch (e) {}
  }

  // Validation errors
  const [errors, setErrors] = useState({});

  // Helper autofills for testing
  const testingAccounts = [
    { label: 'Super Admin', email: 'superadmin@tuhama.com', pass: 'superadmin123' },
    { label: 'Admin', email: 'admin@tuhama.com', pass: 'admin123' },
    { label: 'Counter Staff', email: 'counter@tuhama.com', pass: 'counter123' },
    { label: 'Delivery Staff', email: 'delivery@tuhama.com', pass: 'delivery123' }
  ];

  const handleAutofill = (acc) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setErrors({});
    toast.info(`Autofilled credentials for ${acc.label}`, {
      position: "top-right",
      autoClose: 1500,
      theme: "dark"
    });
  };

  // Field validation
  const validateForm = () => {
    const tempErrors = {};

    // Email check
    if (!email.trim()) {
      tempErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      tempErrors.email = 'Please enter a valid email address';
    }

    // Password check
    if (!password) {
      tempErrors.password = 'Password is required';
    } else if (password.length < 6) {
      tempErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  // Form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form', {
        position: 'top-right',
        theme: 'dark'
      });
      return;
    }

    setIsLoading(true);

    // Simulate standard network delay (1.5 seconds) for premium feel
    setTimeout(() => {
      setIsLoading(false);

      const emailLower = email.toLowerCase().trim();

      // Load staff list
      const savedStaffStr = localStorage.getItem('staff_list');
      let staffList = mockStaff;
      if (savedStaffStr) {
        try {
          staffList = JSON.parse(savedStaffStr);
        } catch (e) {}
      }

      // Check if there is a match in staffList by email or resolve test accounts
      let targetEmail = emailLower;
      if (emailLower === 'admin@tuhama.com') {
        targetEmail = 'dana@tuhama.com';
      } else if (emailLower === 'counter@tuhama.com') {
        targetEmail = 'evan@tuhama.com';
      } else if (emailLower === 'delivery@tuhama.com') {
        targetEmail = 'frank@tuhama.com';
      }

      const staffRecord = staffList.find(s => s.email && s.email.toLowerCase().trim() === targetEmail);

      // Enforce lock verification
      if (staffRecord && staffRecord.isLocked) {
        toast.error("Access denied. Your account is locked. Please contact the Super Admin.", {
          position: 'top-right',
          theme: 'dark',
          autoClose: 5000
        });
        return;
      }

      const chosenBranch = branchesList.find(b => b.id === Number(selectedBranchId)) || { id: 1, name: 'Ragheey' };
      localStorage.setItem('selected_branch', chosenBranch.id);

      if (emailLower === 'superadmin@tuhama.com' || emailLower.includes('superadmin')) {
        localStorage.setItem(
          'user',
          JSON.stringify({ name: 'Super Admin', role: 'Super Admin', email: emailLower, branchId: chosenBranch.id, branch: chosenBranch.name })
        );
        toast.success('Welcome back, Super Admin!', {
          position: "top-right",
          theme: "dark"
        });
        navigate('/superadmin/dashboard');
      } else if (emailLower === 'admin@tuhama.com' || (staffRecord && staffRecord.role === 'Admin')) {
        const record = staffRecord || staffList.find(s => s.role === 'Admin' && s.email === 'dana@tuhama.com');

        localStorage.setItem(
          'user',
          JSON.stringify({ 
            name: record?.name || 'Dana Lee', 
            role: 'Admin', 
            email: emailLower, 
            branchId: chosenBranch.id, 
            branch: chosenBranch.name
          })
        );
        toast.success('Welcome back, System Administrator!', {
          position: "top-right",
          theme: "dark"
        });
        navigate('/admin/dashboard');
      } else if (emailLower === 'counter@tuhama.com' || (staffRecord && staffRecord.role === 'Counter Staff')) {
        const record = staffRecord || { name: 'Evan Wu' };
        localStorage.setItem(
          'user',
          JSON.stringify({ 
            name: record.name, 
            role: 'Counter Staff', 
            email: emailLower, 
            branchId: chosenBranch.id,
            branch: chosenBranch.name 
          })
        );
        toast.success('Welcome back, Counter Lead!', {
          position: "top-right",
          theme: "dark"
        });
        navigate('/counter/dashboard');
      } else if (emailLower === 'delivery@tuhama.com' || (staffRecord && staffRecord.role === 'Delivery Staff')) {
        const record = staffRecord || { name: 'Frank Brown' };
        localStorage.setItem(
          'user',
          JSON.stringify({ 
            name: record.name, 
            role: 'Delivery Staff', 
            email: emailLower, 
            branchId: chosenBranch.id,
            branch: chosenBranch.name 
          })
        );
        toast.success('Welcome back, Delivery Specialist!', {
          position: "top-right",
          theme: "dark"
        });
        navigate('/delivery/dashboard');
      } else {
        // Fallback for other emails
        if (emailLower.includes('admin')) {
          localStorage.setItem(
            'user',
            JSON.stringify({ name: 'Dana Lee', role: 'Admin', email: emailLower, branchId: chosenBranch.id, branch: chosenBranch.name })
          );
          toast.success('Welcome back, System Administrator!', {
            position: "top-right",
            theme: "dark"
          });
          navigate('/admin/dashboard');
        } else if (emailLower.includes('counter')) {
          localStorage.setItem(
            'user',
            JSON.stringify({ name: 'Evan Wu', role: 'Counter Staff', email: emailLower, branchId: chosenBranch.id, branch: chosenBranch.name })
          );
          toast.success('Welcome back, Counter Lead!', {
            position: "top-right",
            theme: "dark"
          });
          navigate('/counter/dashboard');
        } else if (emailLower.includes('delivery')) {
          localStorage.setItem(
            'user',
            JSON.stringify({ name: 'Frank Brown', role: 'Delivery Staff', email: emailLower, branchId: chosenBranch.id, branch: chosenBranch.name })
          );
          toast.success('Welcome back, Delivery Specialist!', {
            position: "top-right",
            theme: "dark"
          });
          navigate('/delivery/dashboard');
        } else {
          localStorage.setItem(
            'user',
            JSON.stringify({ name: 'John Doe', role: 'Admin', email: emailLower, branchId: chosenBranch.id, branch: chosenBranch.name })
          );
          toast.success('Login Successful! Defaulting to Admin Portal.', {
            position: "top-right",
            theme: "dark"
          });
          navigate('/admin/dashboard');
        }
      }
    }, 1500);
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    if (!email) {
      toast.warning('Please enter your email address first to reset password', {
        position: "top-right",
        theme: "dark"
      });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error('Please enter a valid email address', {
        position: "top-right",
        theme: "dark"
      });
      return;
    }
    toast.success(`Password reset instructions sent to ${email}`, {
      position: "top-right",
      theme: "dark"
    });
  };

  return (
    <div className="login-card-content">
      <form onSubmit={handleSubmit} className="login-form" noValidate>
        {/* Email Address Input */}
        <div className="form-group">
          <label className="form-label" htmlFor="email-input">Email Address</label>
          <div className="input-wrapper">
            <input
              id="email-input"
              type="email"
              className={`form-input ${errors.email ? 'border-red-500' : ''}`}
              placeholder="name@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              disabled={isLoading}
              required
            />
            <FiMail className="input-icon-prefix" />
          </div>
          {errors.email && (
            <span className="error-text">
              <FiAlertCircle className="inline" /> {errors.email}
            </span>
          )}
        </div>

        {/* Password Input */}
        <div className="form-group">
          <div className="label-container">
            <label className="form-label" htmlFor="password-input">Password</label>
          </div>
          <div className="input-wrapper">
            <input
              id="password-input"
              type={showPassword ? 'text' : 'password'}
              className={`form-input ${errors.password ? 'border-red-500' : ''}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              disabled={isLoading}
              required
            />
            <FiLock className="input-icon-prefix" />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex="-1"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <span className="error-text">
              <FiAlertCircle className="inline" /> {errors.password}
            </span>
          )}
        </div>

        {/* Branch Selector Input */}
        <div className="form-group">
          <label className="form-label" htmlFor="branch-input">Branch</label>
          <div className="input-wrapper">
            <select
              id="branch-input"
              className="form-input appearance-none"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(Number(e.target.value))}
              disabled={isLoading}
              style={{ background: 'rgba(15, 23, 42, 0.45)', color: '#fff', cursor: 'pointer', WebkitAppearance: 'none', MozAppearance: 'none' }}
            >
              {branchesList.map((b) => (
                <option key={b.id} value={b.id} style={{ background: '#0f172a', color: '#fff' }}>
                  {b.name}
                </option>
              ))}
            </select>
            <FiMapPin className="input-icon-prefix" />
          </div>
        </div>

        {/* Action controls (Remember Me & Forgot Password) */}
        <div className="form-actions">
          <label className="checkbox-container">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
            />
            <div className="custom-checkbox"></div>
            <span className="checkbox-label">Remember me</span>
          </label>
          <a
            href="#forgot-password"
            onClick={handleForgotPassword}
            className="forgot-password-link"
          >
            Forgot password?
          </a>
        </div>

        {/* Submit Action Button */}
        <button
          type="submit"
          className="submit-btn"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <FiLoader className="spinner" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In to Dashboard</span>
              <FiArrowRight />
            </>
          )}
        </button>
      </form>

      {/* Quick Autofill testing suite */}
      <div className="testing-helper-card">
        <h4 className="helper-title">Quick Test Accounts</h4>
        <div className="helper-pills">
          {testingAccounts.map((acc, index) => {
            const isActive = email === acc.email && password === acc.pass;
            return (
              <button
                key={index}
                type="button"
                className={`helper-pill ${isActive ? 'helper-pill-active' : ''}`}
                onClick={() => handleAutofill(acc)}
                disabled={isLoading}
              >
                {isActive && <FiCheck className="w-3.5 h-3.5 text-cyan-400" />}
                {acc.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
