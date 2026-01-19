import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { validateApiKey } from '../services/geminiService';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ApiErrorDetail } from '../types';


interface LoginScreenProps {
  onPlayPrebuilt: () => void;
  isLoading?: boolean;
  loadingMessage?: string;
  apiError?: ApiErrorDetail | null;
  onClearError?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onPlayPrebuilt,
  isLoading = false,
  loadingMessage = "Carregando...",
  apiError = null,
  onClearError
}) => {
  const [loginMode, setLoginMode] = useState<'code' | 'api'>('code');
  const [accessCode, setAccessCode] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (loginMode === 'code') {
      const cleanedCode = accessCode.trim();
      if (!cleanedCode) {
        setError('Por favor, insira o código de acesso.');
        return;
      }

      setIsValidating(true);
      try {
        const docRef = doc(db, "auth", "config");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.secret_code === cleanedCode) {
            const adminKey = data.admin_key;
            if (adminKey) {
              const isValid = await validateApiKey(adminKey);
              if (isValid) {
                login(adminKey);
              } else {
                setError('Erro técnico: A chave do administrador está inválida.');
              }
            } else {
              setError('Erro técnico: Chave do administrador não encontrada.');
            }
          } else {
            setError('Código de acesso incorreto.');
          }
        } else {
          setError('Sistema de autenticação não configurado no Firestore.');
        }
      } catch (err) {
        console.error("Firebase Error:", err);
        setError('Erro ao conectar com o Firebase. Verifique sua conexão.');
      } finally {
        setIsValidating(false);
      }
    } else {
      const cleanedKey = inputKey.trim();
      if (!cleanedKey) {
        setError('Por favor, insira uma chave de API.');
        return;
      }
      if (!cleanedKey.startsWith('AIza')) {
        setError('A chave parece inválida. Chaves do Google geralmente começam com "AIza".');
        return;
      }
      setIsValidating(true);
      try {
        const isValid = await validateApiKey(cleanedKey);
        if (isValid) {
          login(cleanedKey);
        } else {
          setError('Chave incorreta ou inativa. O Google recusou a conexão.');
        }
      } catch (err) {
        setError('Erro ao validar a chave. Verifique sua conexão.');
      } finally {
        setIsValidating(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d] p-4 animate-fade-in font-sans">
      <div className="bg-[#1a1a1a] w-full max-w-md p-10 md:p-12 rounded-[2rem] shadow-2xl border border-white/5 flex flex-col items-center relative overflow-hidden">

        {/* Borda superior decorativa com brilho */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#5b3c88] shadow-[0_0_15px_rgba(91,60,136,0.5)]"></div>

        {/* Ícone de Escudo em destaque (Wrapper) */}
        <div className="w-20 h-20 bg-[#5b3c88]/10 rounded-full flex items-center justify-center mb-8 border border-white/5 relative">
          <div className="absolute inset-0 rounded-full bg-[#5b3c88]/10 blur-xl"></div>
          <div className="relative w-14 h-14 rounded-full border border-[#5b3c88]/40 flex items-center justify-center text-[#5b3c88]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 drop-shadow-[0_0_8px_rgba(91,60,136,0.6)]">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-black text-white text-center mb-1 tracking-tight">Aval<span className="text-[#F7D33C]">ia</span> JW Quiz</h1>
        <p className="text-sm text-gray-400 font-medium mb-10 text-center opacity-80">Acesse o sistema para começar o quiz.</p>

        {/* Barra de Abas: Alterna entre Login por Código ou Chave de API */}
        <div className="w-full bg-black/40 p-1 rounded-2xl flex gap-1 mb-10 border border-white/5">
          <button
            onClick={() => { setLoginMode('code'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-sm ${loginMode === 'code' ? 'bg-[#2a2a2a] text-white shadow-lg' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
            </svg>
            Código
          </button>
          <button
            onClick={() => { setLoginMode('api'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-sm ${loginMode === 'api' ? 'bg-[#2a2a2a] text-white shadow-lg' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
            </svg>
            Chave API
          </button>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-8">
          {loginMode === 'code' ? (
            <div className="animate-fade-in flex flex-col">
              <label className="text-xs font-bold text-gray-500 mb-3 tracking-wide">Código de Acesso</label>
              <input
                type="password"
                value={accessCode}
                onChange={(e) => { setAccessCode(e.target.value); setError(''); }}
                placeholder="Digite o código..."
                className="w-full bg-[#262626] border border-white/5 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-jw-blue/40 transition-all text-sm font-medium"
              />
              <p className="mt-4 text-[11px] text-gray-500 font-medium opacity-60">Não tem um código? Solicite ao administrador do sistema.</p>
            </div>
          ) : (
            <div className="animate-fade-in flex flex-col">
              <label className="text-xs font-bold text-gray-500 mb-3 tracking-wide text-left">Sua Chave Google AI Studio</label>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => { setInputKey(e.target.value); setError(''); }}
                placeholder="AIzaSy..."
                className="w-full bg-[#262626] border border-white/5 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-jw-blue/40 transition-all text-sm font-medium mb-3"
              />
              <div className="flex justify-end">
                <a
                  href="https://aistudio.google.com/app/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-[#F7D33C] hover:opacity-80 flex items-center gap-1 transition-opacity"
                >
                  Obter chave gratuita
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </a>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-500 font-bold animate-pulse">{error}</p>}

          <button
            type="submit"
            disabled={isValidating}
            className="w-full bg-jw-blue text-white font-bold text-base py-4 rounded-xl hover:bg-opacity-90 transition-all active:scale-[0.98] shadow-xl shadow-jw-blue/20 disabled:opacity-50 flex justify-center items-center"
          >
            {isValidating ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : "Entrar"}
          </button>
        </form>

        <div className="w-full flex items-center gap-4 my-8">
          <div className="flex-1 h-[1px] bg-white/5"></div>
          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">ou</span>
          <div className="flex-1 h-[1px] bg-white/5"></div>
        </div>

        <button
          onClick={onPlayPrebuilt}
          className="w-full group relative overflow-hidden bg-white/5 border border-white/10 hover:border-jw-blue/30 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-jw-blue/0 via-jw-blue/5 to-jw-blue/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#F7D33C]">
            <path d="M11.584 2.376a.75.75 0 01.832 0l8.32 5.547a.75.75 0 01.416.677V20.25a.75.75 0 01-.75.75h-15a.75.75 0 01-.75-.75V8.6a.75.75 0 01.416-.677l8.32-5.547zM12 4.732 5.25 9.232V19.5h13.5V9.232L12 4.732z" />
          </svg>
          Explorar Biblioteca
        </button>

        <div className="mt-14 text-[10px] uppercase font-bold tracking-[0.10em] text-gray-600 opacity-60">
          Nenhuma informação pessoal sua será armazenada
        </div>
      </div>


      {/* Tela de Sobreposição de Carregamento (Exibida durante ações demoradas) */}
      {
        isLoading && (
          <div className="fixed inset-0 z-[60] bg-[#121212]/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in text-center px-4 cursor-wait">
            <div className="relative mb-8">
              <div className="w-16 h-16 md:w-20 md:h-20 border-[6px] border-gray-800 rounded-full"></div>
              <div className="w-16 h-16 md:w-20 md:h-20 border-[6px] border-t-jw-blue border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-300 mb-6 tracking-wide">Aguarde...</h2>
            <p className="text-gray-400 text-sm md:text-base max-w-lg italic font-serif opacity-80 leading-relaxed animate-pulse">
              "{loadingMessage}"
            </p>
          </div>
        )
      }

      {/* Modal de Erro Global (Exibe mensagens de erro vindas da API ou Firebase) */}
      {
        apiError && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#1e1e1e] max-w-md w-full rounded-2xl shadow-2xl border border-red-500/30 overflow-hidden">
              <div className="bg-red-900/20 p-6 border-b border-red-500/20 flex items-start gap-4">
                <div className="p-3 bg-red-500/20 rounded-full shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-red-200">{apiError.title}</h3>
                  <p className="text-red-300/70 text-sm font-mono mt-1">Código: {apiError.code}</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-gray-300 opacity-90 leading-relaxed">{apiError.message}</p>
                <div className="bg-black/30 p-4 rounded-lg text-sm opacity-80 border border-gray-600/30 text-gray-400">
                  <strong>Sugestão:</strong> {apiError.solution}
                </div>
                <button
                  onClick={onClearError}
                  className="w-full py-3 bg-jw-blue hover:bg-opacity-90 text-white font-bold rounded-lg transition-colors shadow-lg"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};