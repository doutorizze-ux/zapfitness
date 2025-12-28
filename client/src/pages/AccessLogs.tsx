import { useEffect, useState } from 'react';
import api from '../api';
import { Clock } from 'lucide-react';

export const AccessLogs = () => {
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        const fetch = () => {
            api.get('/logs').then(res => setLogs(res.data)).catch(console.error);
        };
        fetch();
        const interval = setInterval(fetch, 5000); // Polling for logs
        return () => clearInterval(interval);
    }, []);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Registros de Acesso</h2>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">Atualização automática</span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="p-4">Horário</th>
                            <th className="p-4">Membro</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Motivo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {logs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50 transition">
                                <td className="p-4 text-slate-600 flex items-center gap-2">
                                    <Clock size={16} className="text-slate-400" />
                                    {new Date(log.scanned_at).toLocaleString('pt-BR')}
                                </td>
                                <td className={`p-4 font-medium ${log.member ? 'text-slate-800' : 'text-slate-400 italic'}`}>{log.member?.name || 'Desconhecido'}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${log.status === 'GRANTED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {log.status === 'GRANTED' ? 'LIBERADO' : 'NEGADO'}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-500">{log.reason || '-'}</td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">Nenhum registro encontrado.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
