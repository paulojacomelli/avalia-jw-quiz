import React, { useState, useEffect } from 'react';
import { playSound } from '../utils/audio';

interface CookieBannerProps {
    onOpenPrivacy: () => void;
}

export function CookieBanner({ onOpenPrivacy }: CookieBannerProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        playSound('click');
        localStorage.setItem('cookie-consent', 'accepted');
        setIsVisible(false);
    };

    const handleDecline = () => {
        playSound('click');
        localStorage.setItem('cookie-consent', 'declined');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:max-w-md z-[200] animate-fade-in-up">
            <div className="bg-jw-card border border-gray-700/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-5 backdrop-blur-xl">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-jw-blue/10 rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-jw-blue">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-white mb-1">Privacidade & Cookies</h3>
                        <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                            Utilizamos cookies e IA para melhorar sua experiência. Ao continuar, você concorda com nossa{' '}
                            <button
                                onClick={(e) => { e.preventDefault(); onOpenPrivacy(); }}
                                className="text-jw-blue hover:underline font-medium"
                            >
                                Política de Privacidade
                            </button>.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleAccept}
                                className="flex-1 px-4 py-2 bg-jw-blue text-white text-xs font-bold rounded-xl hover:brightness-110 transition-all shadow-lg shadow-jw-blue/20"
                            >
                                Aceitar Tudo
                            </button>
                            <button
                                onClick={handleDecline}
                                className="px-4 py-2 bg-white/5 text-gray-400 text-xs font-bold rounded-xl hover:bg-white/10 transition-all border border-white/5"
                            >
                                Recusar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
