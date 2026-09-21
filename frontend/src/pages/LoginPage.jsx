import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const user = await login(email, password);
      if (user?.role === 'PARENT') {
        navigate('/parent/dashboard');
      } else if (user?.role === 'DRIVER') {
        navigate('/driver');
      } else {
        navigate('/admin');
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand login-brand">
          <span className="brand-mark">SB</span>
          <span>School Bus Portal</span>
        </div>
        <h1>Sign in</h1>
        <p>Access your school transportation workspace.</p>
        {error && <div className="form-error">{error}</div>}
        <label>
          Email or Phone Number
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            placeholder="name@example.com or 9876543210"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <button type="submit" className="primary-button">
          Sign in securely
        </button>
      </form>
    </div>
  );
}
