import React from 'react';
import { playSound } from '../utils/audio';

interface PrivacyPolicyModalProps {
    isOpen: boolean;
    onClose: () => void;
    appName: string;
}

export function PrivacyPolicyModal({ isOpen, onClose, appName }: PrivacyPolicyModalProps) {
    if (!isOpen) return null;

    const handleClose = () => {
        playSound('click');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8 animate-fade-in">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={handleClose}
            />
            <div className="relative w-full max-w-2xl max-h-[80vh] bg-jw-card border border-gray-700/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-zoom-in">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-700/30 flex items-center justify-between bg-black/20">
                    <h2 className="text-lg font-bold text-white">Política de Privacidade</h2>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-sm text-gray-300 leading-relaxed custom-scrollbar">
                    <section>
                        <h3 className="text-white font-bold mb-2">1. Introdução</h3>
                        <p>Bem-vindo ao <strong>{appName}</strong>. Valorizamos sua privacidade e estamos comprometidos em proteger seus dados pessoais. Esta política explica como lidamos com as informações.</p>
                    </section>

                    <section>
                        <h3 className="text-white font-bold mb-2">2. Coleta de Dados</h3>
                        <p>Nosso aplicativo utiliza Inteligência Artificial (Google Gemini) para gerar conteúdos. Não coletamos informações pessoais identificáveis (PII) sem seu consentimento. Armazenamos apenas preferências locais como:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
                            <li>Tema (claro/escuro)</li>
                            <li>Configurações de som e narração</li>
                            <li>Nível de zoom preferido</li>
                            <li>Chave de API (criptografada localmente no seu navegador)</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-white font-bold mb-2">3. Uso de IA</h3>
                        <p>As perguntas e respostas são geradas dinamicamente. Os prompts enviados à IA não contêm seus dados pessoais. O uso do serviço está sujeito às políticas de uso da Google Generative AI.</p>
                    </section>

                    <section>
                        <h3 className="text-white font-bold mb-2">4. Cookies</h3>
                        <p>Utilizamos cookies estritamente necessários para o funcionamento das preferências e segurança da sessão. Você pode gerenciar ou recusar esses cookies através do banner inicial ou das configurações do seu navegador.</p>
                    </section>

                    <section>
                        <h3 className="text-white font-bold mb-2">5. Contato</h3>
                        <p>Dúvidas sobre como tratamos seus dados podem ser enviadas através dos nossos canais oficiais de suporte.</p>
                    </section>

                    <div className="pt-4 border-t border-gray-700/30 text-[10px] text-gray-500 text-center">
                        Última atualização: Janeiro de 2026 • v1.3.16-beta
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-black/20 flex justify-end gap-3 border-t border-gray-700/30">
                    <button
                        onClick={handleClose}
                        className="px-6 py-2 bg-jw-blue text-white text-xs font-bold rounded-xl hover:brightness-110 transition-all"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}
