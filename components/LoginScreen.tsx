import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { validateApiKey } from '../services/geminiService';

export const LoginScreen: React.FC = () => {
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    setError('');

    try {
      const isValid = await validateApiKey(cleanedKey);
      
      if (isValid) {
        login(cleanedKey);
      } else {
        setError('Chave incorreta ou inativa. O Google recusou a conexão.');
      }
    } catch (e) {
      setError('Erro ao validar a chave. Verifique sua conexão.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-jw-dark p-4 animate-fade-in">
      <div className="bg-jw-card w-full max-w-md p-8 rounded-2xl shadow-2xl border border-gray-700/50">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-jw-blue p-3 rounded-full mb-4 shadow-lg shadow-purple-900/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-jw-text text-center">JW Quiz Creator</h1>
          <p className="text-sm text-gray-400 mt-2 text-center">Insira sua chave da API Google Gemini para começar.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-2">
              Google AI Studio Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={inputKey}
              onChange={(e) => {
                setInputKey(e.target.value);
                setError('');
              }}
              placeholder="AIzaSy..."
              className="w-full bg-jw-hover border border-gray-600 rounded-lg px-4 py-3 text-jw-text placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-jw-blue focus:border-transparent transition-all disabled:opacity-50"
              disabled={isValidating}
            />
            {error && <p className="mt-2 text-sm text-red-400 animate-pulse">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isValidating}
            className="w-full bg-jw-blue text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 transition-transform active:scale-95 shadow-lg flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
          >
            {isValidating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verificando...
              </>
            ) : (
              <>
                Acessar Quiz
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-700/50 text-center">
          <p className="text-xs text-gray-500 mb-3">Não tem uma chave?</p>
          <a
            href="https://aistudio.google.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-jw-blue hover:text-white transition-colors"
          >
            Obter chave gratuita no Google AI Studio
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 ml-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
          <p className="text-[10px] text-gray-600 mt-4">
            Sua chave é armazenada apenas no seu navegador. Nenhuma informação é enviada para nossos servidores.
          </p>
        </div>
      </div>
    </div>
  );
};