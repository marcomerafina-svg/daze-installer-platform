import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, LogIn, Eye, EyeOff } from 'lucide-react';
import DazeLogo from '../../components/shared/DazeLogo';
import Button from '../../components/shared/Button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  // Redirect se l'utente è già loggato
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/installer', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Credenziali non valide');
    } finally {
      setLoading(false);
    }
  };

  // Mostra loading mentre controlla se l'utente è loggato
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-daze-blue flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-squircle shadow-strong p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-6">
              <DazeLogo height={56} />
            </div>
            <h1 className="text-2xl font-roobert font-bold text-daze-black mb-2">Benvenuto</h1>
            <p className="text-sm font-inter text-daze-blue">Gestione Lead Installatori</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 animate-scale-in">
                <AlertCircle className="w-5 h-5 text-daze-salmon-dark flex-shrink-0 mt-0.5" />
                <p className="text-sm text-rose-800 font-medium">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium font-inter text-daze-black mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-daze-gray rounded-xl outline-none focus:ring-0 focus:border-daze-blue transition-all text-daze-black font-inter placeholder:text-daze-border"
                placeholder="tua@email.it"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium font-inter text-daze-black mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 border border-daze-gray rounded-xl outline-none focus:ring-0 focus:border-daze-blue transition-all text-daze-black font-inter placeholder:text-daze-border"
                  placeholder="Inserisci la password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-daze-border hover:text-daze-black rounded-lg transition-colors outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primaryBlack"
              size="lg"
              disabled={loading}
              fullWidth
              icon={loading ? undefined : <LogIn className="w-5 h-5" />}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Accesso in corso...
                </>
              ) : (
                'Accedi'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-white/70 text-sm mt-6 px-2 font-inter">
          © 2025 Daze - Stazioni di ricarica per auto elettriche
        </p>
      </div>
    </div>
  );
}
