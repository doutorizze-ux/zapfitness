import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import io from 'socket.io-client';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

const socket = io('http://localhost:3000');

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
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Conexão WhatsApp</h2>

            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                {status === 'CONNECTED' ? (
                    <div className="text-center animate-fade-in">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                            ✓
                        </div>
                        <h3 className="text-xl font-bold text-green-700">Conectado com Sucesso</h3>
                        <p className="text-slate-500 mt-2 mb-4">O bot está ativo e respondendo aos membros na conta principal.</p>
                        <button
                            onClick={async () => {
                                if (confirm('Tem certeza que deseja desconectar?')) {
                                    setLoading(true);
                                    await api.post('/whatsapp/disconnect');
                                    setLoading(false);
                                }
                            }}
                            className="text-red-500 text-sm hover:underline"
                        >
                            Desconectar / Resetar
                        </button>
                    </div>
                ) : (
                    <div className="text-center w-full">
                        {!qr && status !== 'SCAN_QR' && (
                            <div className="mb-6">
                                <p className="text-slate-600 mb-4">Para ativar o sistema, conecte o WhatsApp da Academia.</p>
                                <button
                                    onClick={handleConnect}
                                    disabled={loading || status === 'CONNECTED'}
                                    className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50 transition"
                                >
                                    {loading ? 'Iniciando Sessão...' : 'Conectar WhatsApp'}
                                </button>
                            </div>
                        )}

                        {qr && status !== 'CONNECTED' && (
                            <div className="bg-white p-4 rounded-lg shadow-lg inline-block animate-fade-in-up">
                                <QRCode value={qr} size={256} />
                                <p className="mt-4 text-sm font-medium text-slate-700">Escaneie com o WhatsApp (Aparelhos Conectados)</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-8 border-t border-slate-200 pt-8">
                <h3 className="text-xl font-bold text-slate-800 mb-4">QR Code de Acesso (Recepção)</h3>
                <p className="text-slate-600 mb-6">Este QR Code deve ser fixado na entrada. O aluno escaneia para liberar o acesso.</p>

                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-200">
                        <QRCode
                            value={`https://wa.me/${tenantInfo?.whatsapp_number?.replace(/\D/g, '') || ''}?text=cheguei`}
                            size={180}
                        />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-slate-800 mb-2">Como funciona:</h4>
                        <ol className="list-decimal list-inside text-slate-600 space-y-2 text-sm">
                            <li>O aluno abre a câmera e aponta para o código.</li>
                            <li>O WhatsApp abre automaticamente com a mensagem <strong>"checkin"</strong> ou <strong>"cheguei"</strong>.</li>
                            <li>O aluno envia a mensagem.</li>
                            <li>O sistema valida a assinatura e responde imediatamente.</li>
                        </ol>
                        <div className="mt-6 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm">
                            <strong>Nota:</strong> Certifique-se de que o número do WhatsApp da academia esteja conectado acima para que o link funcione corretamente.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
