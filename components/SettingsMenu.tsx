import React, { useEffect, useMemo, useRef } from "react";
import { playSound } from "../utils/audio";

export type ThemeMode = "system" | "light" | "dark";
export type TtsMode = "gemini" | "browser" | "off";

type SettingsMenuProps = {
    open: boolean;
    onToggle: () => void;
    onClose: () => void;

    soundEnabled: boolean;
    onToggleSound: () => void;

    theme: ThemeMode;
    onThemeChange: (mode: ThemeMode) => void;

    ttsMode: TtsMode;
    onTtsChange: (mode: TtsMode) => void;

    zoomLabel?: string;
    zoomValue: number;
    onZoomIn: () => void;
    onZoomOut: () => void;

    isFullscreen: boolean;
    onToggleFullscreen: () => void;

    onOpenGuide: () => void;
    onGoHome: () => void;
    onLogout: () => void;
};

export function SettingsMenu(props: SettingsMenuProps) {
    const {
        open, onToggle, onClose,
        soundEnabled, onToggleSound,
        theme, onThemeChange,
        ttsMode, onTtsChange,
        zoomValue, onZoomIn, onZoomOut,
        isFullscreen, onToggleFullscreen,
        onOpenGuide, onGoHome, onLogout,
        zoomLabel = "Zoom",
    } = props;

    const rootRef = useRef<HTMLDivElement | null>(null);
    const buttonId = useMemo(() => `settings-button-${Math.random().toString(36).slice(2)}`, []);
    const menuId = useMemo(() => `settings-menu-${Math.random().toString(36).slice(2)}`, []);

    // Fecha ao clicar fora
    useEffect(() => {
        if (!open) return;

        const onDown = (e: MouseEvent | TouchEvent) => {
            const el = rootRef.current;
            if (!el) return;
            if (!el.contains(e.target as Node)) onClose();
        };

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        document.addEventListener("mousedown", onDown);
        document.addEventListener("touchstart", onDown);
        document.addEventListener("keydown", onKey);

        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("touchstart", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    const handleAction = (fn: () => void) => {
        playSound('click');
        fn();
    };

    return (
        <div ref={rootRef} className="relative">
            <button
                id={buttonId}
                className="p-2 rounded-full hover:bg-black/10 transition-colors opacity-90 hover:opacity-100 text-white"
                aria-haspopup="menu"
                aria-controls={menuId}
                aria-expanded={open}
                onClick={() => handleAction(onToggle)}
                title="Configurações"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 transition-transform duration-300 ${open ? 'rotate-90 text-jw-blue' : ''}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>

            {open && (
                <div
                    id={menuId}
                    role="menu"
                    aria-labelledby={buttonId}
                    className="absolute top-full right-0 mt-2 min-w-[280px] bg-jw-card border border-gray-700/50 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] p-2 z-[100] animate-fade-in origin-top-right backdrop-blur-md"
                >
                    <div className="flex flex-col gap-1">
                        <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-700/30 mb-1">
                            Configurações
                        </div>

                        {/* Som */}
                        <button
                            role="menuitem"
                            className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-jw-hover transition-colors group"
                            onClick={() => handleAction(onToggleSound)}
                        >
                            <div className="flex items-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:text-jw-blue">
                                    {soundEnabled ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                    )}
                                </svg>
                                <span className="text-sm font-medium">Sons e Efeitos</span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${soundEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                {soundEnabled ? 'ON' : 'OFF'}
                            </span>
                        </button>

                        {/* Tema */}
                        <div className="flex flex-col gap-2 p-3 bg-black/20 rounded-xl mt-1">
                            <span className="px-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Aparência</span>
                            <div className="grid grid-cols-3 gap-1">
                                {(['light', 'dark', 'system'] as ThemeMode[]).map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => handleAction(() => onThemeChange(m))}
                                        className={`text-[10px] py-2 rounded-lg font-bold border transition-all ${theme === m ? 'bg-jw-blue border-jw-blue text-white shadow-lg' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}`}
                                    >
                                        {m === 'light' ? 'Claro' : m === 'dark' ? 'Escuro' : 'Auto'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* TTS */}
                        <div className="flex flex-col gap-2 p-3 bg-black/20 rounded-xl mt-1">
                            <span className="px-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Narração (TTS)</span>
                            <div className="grid grid-cols-3 gap-1">
                                {(['gemini', 'browser', 'off'] as TtsMode[]).map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => handleAction(() => onTtsChange(m))}
                                        className={`text-[10px] py-2 rounded-lg font-bold border transition-all ${ttsMode === m ? 'bg-jw-blue border-jw-blue text-white shadow-lg' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}`}
                                    >
                                        {m === 'gemini' ? 'IA' : m === 'browser' ? 'Nativa' : 'Off'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Zoom */}
                        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-black/20 mt-1">
                            <div className="flex items-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 opacity-60">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                                </svg>
                                <span className="text-sm font-medium">{zoomLabel}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleAction(onZoomOut)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                </button>
                                <span className="text-[11px] font-mono w-10 text-center text-jw-blue font-bold">{Math.round(zoomValue * 100)}%</span>
                                <button
                                    onClick={() => handleAction(onZoomIn)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>
                                </button>
                            </div>
                        </div>

                        <div className="h-px bg-gray-700/30 my-1 mx-2" />

                        {/* Tela Cheia */}
                        <button
                            role="menuitem"
                            className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-jw-hover transition-colors group"
                            onClick={() => handleAction(onToggleFullscreen)}
                        >
                            <div className="flex items-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:text-jw-blue">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                </svg>
                                <span className="text-sm font-medium">Tela Cheia</span>
                            </div>
                            <span className="text-[10px] uppercase font-bold text-gray-500">{isFullscreen ? 'ON' : 'OFF'}</span>
                        </button>

                        {/* Guia */}
                        <button
                            role="menuitem"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-jw-hover transition-colors group"
                            onClick={() => handleAction(onOpenGuide)}
                        >
                            <div className="w-5 h-5 rounded-full border border-gray-500 group-hover:border-jw-blue flex items-center justify-center text-[10px] font-bold text-gray-500 group-hover:text-jw-blue transition-colors">?</div>
                            <span className="text-sm font-medium">Ajuda e Tutorial</span>
                        </button>

                        {/* Início */}
                        <button
                            role="menuitem"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-colors group"
                            onClick={() => handleAction(onGoHome)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-500 opacity-60 group-hover:opacity-100">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                            </svg>
                            <span className="text-sm font-medium text-red-400">Voltar ao Início</span>
                        </button>

                        <button
                            role="menuitem"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group"
                            onClick={() => handleAction(onLogout)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500 opacity-60 group-hover:opacity-100">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                            </svg>
                            <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">Alterar Chave / Sair</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
