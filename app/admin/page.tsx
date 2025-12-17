'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

type UsuarioStats = {
  user_id: string;
  full_name: string;
  carnet: string;
  semestre: string;
  total_intentos: number;
  mejor_puntaje: number;
};

// Definimos el tipo para el detalle de la pregunta
type DetallePregunta = {
  palabra: string;
  correcta: boolean;
  escrita: string;
};

type HistorialPartida = {
  id: number;
  score: number;
  completed_at: string;
  details: DetallePregunta[] | null; // <--- Ahora traemos los detalles
};

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [usuarios, setUsuarios] = useState<UsuarioStats[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);

  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<UsuarioStats | null>(null);
  const [historial, setHistorial] = useState<HistorialPartida[]>([]);
  const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false);
  
  // Estado para expandir el detalle de una partida específica
  const [partidaExpandida, setPartidaExpandida] = useState<number | null>(null);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    const { data, error } = await supabase
      .from('admin_users_stats')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) console.error(error);
    else {
        // @ts-ignore
        const todos = data || [];
        // FILTRO: Ocultar al Administrador de la lista
        const soloEstudiantes = todos.filter((u: UsuarioStats) => u.carnet !== 'admindeljuego');
        setUsuarios(soloEstudiantes);
    }
    setLoading(false);
  };

  const verHistorial = async (usuario: UsuarioStats) => {
    setUsuarioSeleccionado(usuario);
    setPartidaExpandida(null);
    
    // Pedimos también la columna 'details'
    const { data } = await supabase
        .from('game_results')
        .select('id, score, completed_at, details') 
        .eq('user_id', usuario.user_id)
        .order('completed_at', { ascending: false });
    
    // @ts-ignore
    setHistorial(data || []);
    setModalHistorialAbierto(true);
  };

  const eliminarUsuario = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás SEGURO de eliminar al estudiante "${nombre}"?\nSe borrarán sus datos permanentemente.`)) return;

    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else {
        alert('Usuario eliminado.');
        fetchUsuarios();
    }
  };

  const filtrados = usuarios.filter(u => {
    const texto = busqueda.toLowerCase();
    return u.full_name?.toLowerCase().includes(texto) || u.carnet?.includes(texto);
  });

  if (loading) return <div className="p-10 text-center text-black font-bold">Cargando sistema...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans text-black">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-lg shadow">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">GESTIÓN DE ESTUDIANTES</h1>
            <p className="text-gray-500">Total registrados: {usuarios.length}</p>
          </div>
          <button onClick={() => router.push('/')} className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded font-bold transition">
            Salir
          </button>
        </div>

        <div className="mb-6">
          <input 
            type="text" 
            placeholder="🔍 Buscar por nombre o carnet..." 
            className="w-full p-4 border rounded-lg shadow-sm outline-none text-lg focus:ring-2 focus:ring-blue-500"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full leading-normal">
            <thead>
              <tr className="bg-blue-900 text-white text-left">
                <th className="px-5 py-4">Estudiante</th>
                <th className="px-5 py-4">Carnet</th>
                <th className="px-5 py-4">Semestre</th>
                <th className="px-5 py-4 text-center">Intentos</th>
                <th className="px-5 py-4 text-center">Mejor Nota</th>
                <th className="px-5 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-gray-500">No hay estudiantes.</td></tr>
              ) : (
                filtrados.map((u) => (
                  <tr key={u.user_id} className="hover:bg-blue-50 border-b transition">
                    <td className="px-5 py-4 font-bold text-gray-800">{u.full_name}</td>
                    <td className="px-5 py-4 text-gray-600">{u.carnet}</td>
                    <td className="px-5 py-4 text-gray-600">{u.semestre}º</td>
                    <td className="px-5 py-4 text-center">
                        <span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-xs font-bold">{u.total_intentos}</span>
                    </td>
                    <td className={`px-5 py-4 text-center font-bold ${u.mejor_puntaje >= 51 ? 'text-green-600' : 'text-red-500'}`}>
                        {u.mejor_puntaje}
                    </td>
                    <td className="px-5 py-4 flex justify-center gap-3">
                      <button onClick={() => verHistorial(u)} title="Ver Historial" className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded shadow transition">👁️</button>
                      <button onClick={() => eliminarUsuario(u.user_id, u.full_name)} title="Eliminar" className="bg-red-500 hover:bg-red-600 text-white p-2 rounded shadow transition">🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL DE HISTORIAL DETALLADO --- */}
      {modalHistorialAbierto && usuarioSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-0 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-down h-[80vh] flex flex-col">
            
            <div className="bg-blue-900 p-4 text-white flex justify-between items-center shrink-0">
                <h2 className="text-xl font-bold">Historial de {usuarioSeleccionado.full_name}</h2>
                <button onClick={() => setModalHistorialAbierto(false)} className="text-white hover:text-gray-300 font-bold text-xl">✕</button>
            </div>

            <div className="p-6 overflow-y-auto grow">
                {historial.length === 0 ? (
                    <p className="text-center text-gray-500 italic">Sin partidas registradas.</p>
                ) : (
                    <div className="space-y-4">
                        {historial.map((h) => (
                            <div key={h.id} className="border rounded-lg overflow-hidden shadow-sm">
                                {/* Resumen de la partida */}
                                <div 
                                    className="bg-gray-50 p-3 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                                    onClick={() => setPartidaExpandida(partidaExpandida === h.id ? null : h.id)}
                                >
                                    <div>
                                        <p className="text-sm text-gray-600">{new Date(h.completed_at).toLocaleString()}</p>
                                        <p className="text-xs text-blue-600 font-bold mt-1">
                                            {partidaExpandida === h.id ? '▼ Ocultar detalle' : '▶ Ver detalle'}
                                        </p>
                                    </div>
                                    <div className={`text-xl font-bold ${h.score >= 51 ? 'text-green-600' : 'text-red-500'}`}>
                                        {h.score}/100
                                    </div>
                                </div>

                                {/* Detalle desplegable */}
                                {partidaExpandida === h.id && (
                                    <div className="bg-white p-3 border-t">
                                        {!h.details ? (
                                            <p className="text-sm text-gray-400 italic">Detalle no disponible para esta partida antigua.</p>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                {h.details.map((d, idx) => (
                                                    <div key={idx} className={`text-sm p-2 rounded flex justify-between border ${d.correcta ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                                        <span className="font-bold text-gray-700">{d.palabra}</span>
                                                        <span>{d.correcta ? '✅' : '❌'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 bg-gray-50 text-right shrink-0">
                <button onClick={() => setModalHistorialAbierto(false)} className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-bold shadow">
                    Cerrar
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}