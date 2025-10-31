import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';
import DazeLogo from '../../components/shared/DazeLogo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

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

  if (user) {
    if (user.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/installer');
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-reflex-blue via-reflex-blue-400 to-reflex-blue-800 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center mb-3 sm:mb-4">
              <DazeLogo height={48} className="sm:h-16" />
            </div>
            <p className="text-sm sm:text-base text-gray-600">Gestione Lead Installatori</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-cool-gray-400 rounded-lg focus:ring-2 focus:ring-reflex-blue focus:border-transparent transition-all"
                placeholder="tua@email.it"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-cool-gray-400 rounded-lg focus:ring-2 focus:ring-reflex-blue focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-reflex-blue to-reflex-blue-400 text-white py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </form>
        </div>

        <p className="text-center text-white text-xs sm:text-sm mt-4 sm:mt-6 px-2">
          © 2025 Daze - Stazioni di ricarica per auto elettriche
        </p>
      </div>
    </div>
  );
}
