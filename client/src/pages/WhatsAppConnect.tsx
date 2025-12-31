import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import io from 'socket.io-client';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Zap, ShieldCheck, HelpCircle, Smartphone, LogOut, CheckCircle2 } from 'lucide-react';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');

export const WhatsAppConnect = () => {
    const { user } = useAuth();
    const [qr, setQr] = useState('');
    const [status, setStatus] = useState('DISCONNECTED');
    const [loading, setLoading] = useState(false);
    const [tenantInfo, setTenantInfo] = useState<any>(null);

    useEffect(() => {
        api.get('/me').then(res => {
            setTenantInfo(res.data);
            setStatus(res.data.whatsapp_status);
        });

        socket.emit('join_room', user?.tenant_id);

        socket.on('qr_code', (code) => {
            setQr(code);
            setStatus('SCAN_QR');
            setLoading(false);
        });

        socket.on('whatsapp_status', (s) => {
            setStatus(s);
            setLoading(false);
            if (s === 'CONNECTED') setQr('');
        });

        return () => {
            socket.off('qr_code');
            socket.off('whatsapp_status');
        }
    }, [user]);

    const handleConnect = async () => {
        setLoading(true);
        await api.post('/whatsapp/connect');
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in-up pb-24 md:pb-0">
            <div className="mb-2">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Conexão WhatsApp</h2>
                <p className="text-slate-500 font-medium">Ative o bot para responder seus alunos automaticamente.</p>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-slate-100 flex flex-col items-center">
                {status === 'CONNECTED' ? (
                    <div className="text-center w-full max-w-md animate-fade-in">
                        <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border-4 border-white">
                            <CheckCircle2 size={48} />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Totalmente Conectado</h3>
                        <p className="text-slate-500 font-medium leading-relaxed mb-10">
                            Seu bot está ativo! Ele já pode responder check-ins, enviar treinos e gerenciar novos alunos.
                        </p>

                        <div className="flex flex-col gap-4">
                            <div className="bg-green-50 p-4 rounded-2xl flex items-center gap-3 text-green-700 text-sm font-bold">
                                <ShieldCheck size={20} />
                                Bot operacional 24/7
                            </div>
                            <button
                                onClick={async () => {
                                    if (confirm('Deseja realmente desconectar? Isso parará o atendimento automático.')) {
                                        setLoading(true);
                                        await api.post('/whatsapp/disconnect');
                                        setLoading(false);
                                    }
                                }}
                                className="flex items-center justify-center gap-2 p-4 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all font-bold text-sm"
                            >
                                <LogOut size={18} />
                                Desconectar Dispositivo
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center w-full max-w-sm">
                        {!qr && status !== 'SCAN_QR' && (
                            <div className="animate-fade-in">
                                <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-lg shadow-orange-500/10">
                                    <Smartphone size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Vincular Dispositivo</h3>
                                <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                                    Escaneie o QR Code conforme faria no WhatsApp Web para ativar as automações da academia.
                                </p>
                                <button
                                    onClick={handleConnect}
                                    disabled={loading}
                                    className="w-full bg-orange-500 text-white px-8 py-5 rounded-[1.5rem] font-black hover:bg-orange-600 shadow-xl shadow-orange-500/20 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Gerando Token...
                                        </>
                                    ) : (
                                        <>
                                            <Zap size={20} className="fill-white" />
                                            CONECTAR AGORA
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {qr && status !== 'CONNECTED' && (
                            <div className="flex flex-col items-center animate-fade-in-up">
                                <div className="bg-slate-900 p-6 md:p-8 rounded-[3rem] shadow-2xl mb-8 relative">
                                    <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full -z-10 animate-pulse"></div>
                                    <div className="bg-white p-4 rounded-[2rem]">
                                        <QRCode value={qr} size={240} className="w-full h-auto" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-2">Escaneie o Código</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Aguardando leitura pelo WhatsApp</p>
                                <div className="flex gap-2">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
                        <div>
                            <h3 className="text-3xl font-black tracking-tight mb-2">QR Code da Recepção</h3>
                            <p className="text-slate-400 font-medium max-w-md">
                                Imprima e cole este código na entrada da sua academia. Os alunos liberam o acesso escaneando este QR Code.
                            </p>
                        </div>
                        <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-2xl transition-all font-bold text-sm">
                            <HelpCircle size={18} />
                            Dúvidas no Set-up
                        </button>
                    </div>

                    <div className="flex flex-col lg:flex-row items-center gap-12">
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl relative group-hover:scale-105 transition-transform duration-500">
                            <div className="absolute -top-3 -right-3 bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg border-2 border-slate-900 uppercase">Imprimir</div>
                            <QRCode
                                value={`https://wa.me/${tenantInfo?.whatsapp_number?.replace(/\D/g, '') || ''}?text=cheguei`}
                                size={220}
                            />
                        </div>
                        <div className="flex-1 space-y-8">
                            {[
                                { title: '1. Scan Simples', desc: 'O aluno abre o WhatsApp e foca no código na recepção.' },
                                { title: '2. Check-in Direto', desc: 'Uma mensagem "Cheguei" é pré-preenchida no celular dele.' },
                                { title: '3. Liberação Segura', desc: 'O bot valida o plano e libera o acesso em menos de 2 segundos.' }
                            ].map((step, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-black text-orange-500 text-sm">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">{step.title}</h4>
                                        <p className="text-slate-400 text-sm font-medium">{step.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
