'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Crossword from '@jaredreisinger/react-crossword';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

// --- DATOS DEL CRUCIGRAMA (EDICIÓN COMPLETA: REDES + SEGURIDAD + HARDWARE) ---
const datosCrucigrama = {
  across: {
    1: { clue: 'Gestion de procesos de negocio (Siglas)', answer: 'BPM', row: 2, col: 13 },
    5: { clue: 'Comando de linux que lista directorios', answer: 'LS', row: 4, col: 9 },
    8: { clue: 'Garantizar autenticidad, integridad y fiabilidad', answer: 'CADENADECUSTODIA', row: 6, col: 4 },
    10: { clue: 'Sirve para proteger una red de ataques', answer: 'FIREWALL', row: 10, col: 3 },
    11: { clue: 'Sistema operativo open source', answer: 'LINUX', row: 12, col: 3 },
    12: { clue: 'Comando que permite ver la ruta actual', answer: 'PWD', row: 15, col: 2 },
    
    // --- NUEVAS PALABRAS HORIZONTALES ---
    13: { 
      clue: 'Memoria volátil de acceso aleatorio', 
      answer: 'RAM', 
      row: 5, col: 6 // Cruza con la R de HARDWARE
    },
    14: { 
      clue: 'Etiqueta numérica que identifica a un dispositivo en la red', 
      answer: 'IP', 
      row: 5, col: 17 // Cruza con la P de KPI
    }
  },
  down: {
    2: { clue: 'Dispositivo de salida visual', answer: 'MONITOR', row: 2, col: 15 },
    3: { clue: 'Parte fisica de una pc', answer: 'HARDWARE', row: 3, col: 6 },
    4: { clue: 'Funcion que se llama a si misma', answer: 'RECURSIVIDAD', row: 4, col: 4 },
    6: { clue: 'Super usuario', answer: 'SUDO', row: 4, col: 10 },
    7: { clue: 'Indicador Clave de Desempeño', answer: 'KPI', row: 4, col: 18 },
    9: { clue: 'Proceso de datos en un data warehouse', answer: 'ETL', row: 8, col: 9 },
    
    // --- NUEVAS PALABRAS VERTICALES ---
    15: { 
      clue: 'Enrutamiento configurado manualmente por el admin', 
      answer: 'ESTATICO', 
      row: 7, col: 8 // Cruza con la A de FIREWALL
    },
    16: { 
      clue: 'Enrutamiento que aprende rutas automáticamente (Ej: OSPF)', 
      answer: 'DINAMICO', 
      row: 6, col: 17 // Cruza con la D final de CADENA...
    },
    17: {
      clue: 'Malware que necesita un anfitrión para replicarse',
      answer: 'VIRUS',
      row: 3, col: 13 // Cruza con la U de CADENA...
    }
  },
};

export default function PaginaJuego() {
  const supabase = createClient();
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);
  const [nombreUsuario, setNombreUsuario] = useState<string>('');
  
  // Memoria del juego
  const [gridUsuario, setGridUsuario] = useState<Record<string, Record<string, string>>>({});
  
  const [yaEnviado, setYaEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [notaCalculada, setNotaCalculada] = useState<number | null>(null);

  const crosswordRef = useRef<any>(null);

  useEffect(() => {
    async function getUsuario() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUsuario(user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        setNombreUsuario(profile?.full_name || user.user_metadata?.full_name || 'Estudiante');
      } else {
        router.push('/'); 
      }
    }
    getUsuario();
  }, [router, supabase]);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const onCellChange = (row: number, col: number, char: string) => {
    setGridUsuario((prev) => ({
      ...prev,
      [row]: { ...prev[row], [col]: char.toUpperCase() },
    }));
  };

  // --- LÓGICA DE REPORTE DETALLADO (AUTO-AJUSTABLE) ---
  const generarReporte = () => {
    let totalPalabras = 0;
    let aciertos = 0;
    const detalles: any[] = []; 

    // 1. Horizontales
    Object.values(datosCrucigrama.across).forEach((w: any) => {
      totalPalabras++;
      let palabraUser = "";
      for (let i = 0; i < w.answer.length; i++) {
        palabraUser += gridUsuario[w.row]?.[w.col + i] || "";
      }
      const esCorrecta = palabraUser === w.answer;
      if (esCorrecta) aciertos++;
      detalles.push({ palabra: w.answer, correcta: esCorrecta, escrita: palabraUser });
    });

    // 2. Verticales
    Object.values(datosCrucigrama.down).forEach((w: any) => {
      totalPalabras++;
      let palabraUser = "";
      for (let i = 0; i < w.answer.length; i++) {
        palabraUser += gridUsuario[w.row + i]?.[w.col] || "";
      }
      const esCorrecta = palabraUser === w.answer;
      if (esCorrecta) aciertos++;
      detalles.push({ palabra: w.answer, correcta: esCorrecta, escrita: palabraUser });
    });

    const nota = totalPalabras > 0 ? Math.round((aciertos / totalPalabras) * 100) : 0;
    return { nota, aciertos, totalPalabras, detalles };
  };

  const guardarPuntaje = async () => {
    if (!usuario) return;
    
    const confirmacion = window.confirm("¿Enviar respuestas? Se calculará tu nota con lo que tengas.");
    if (!confirmacion) return;

    setEnviando(true);
    
    const { nota, aciertos, totalPalabras, detalles } = generarReporte();
    setNotaCalculada(nota);

    const { error } = await supabase.from('game_results').insert({
      user_id: usuario.id,
      score: nota,
      details: detalles 
    });

    if (error) {
      alert('Error al guardar: ' + error.message);
      setEnviando(false);
    } else {
      setYaEnviado(true);
      alert(`📝 ENVIADO\n\nCorrectas: ${aciertos}/${totalPalabras}\nNOTA FINAL: ${nota}/100`);
    }
  };

  if (!usuario) return <div className="p-10 text-center text-black">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col items-center py-8 font-sans text-black">
      <div className="w-full max-w-6xl px-4 flex justify-between items-center mb-6 bg-blue-900 text-white p-4 rounded-lg shadow-lg">
        <div>
           <h1 className="text-xl font-bold">CRUCIGRAMA SISTEMAS</h1>
           <div className="text-sm text-blue-300">Estudiante: <span className="font-bold text-white">{nombreUsuario}</span></div>
        </div>
        <button onClick={cerrarSesion} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded border border-red-700 transition">
          Cerrar Sesión
        </button>
      </div>
      
      <div className="w-full max-w-5xl mb-4 flex justify-between items-center bg-white p-4 rounded-lg shadow border border-gray-300">
        <div className="text-sm text-gray-600">
            {yaEnviado ? (
                <span className="text-xl font-bold text-blue-800">Tu Nota: {notaCalculada}/100</span>
            ) : (
                <span>Completa las {Object.keys(datosCrucigrama.across).length + Object.keys(datosCrucigrama.down).length} palabras y envía.</span>
            )}
        </div>

        {!yaEnviado ? (
            <button
                onClick={guardarPuntaje}
                disabled={enviando}
                className="py-2 px-6 rounded-lg font-bold text-lg shadow-md transition-all bg-green-600 hover:bg-green-700 text-white border-b-4 border-green-800 active:border-b-0 active:translate-y-1"
            >
                {enviando ? 'Calculando...' : '📤 ENVIAR Y CALIFICAR'}
            </button>
        ) : (
            <div className="bg-gray-200 text-gray-500 px-6 py-2 rounded-lg font-bold cursor-not-allowed border border-gray-300">
                ✅ Enviado
            </div>
        )}
      </div>

      <div className="w-full max-w-5xl bg-white p-6 rounded-xl shadow-2xl border border-gray-400">
        <style jsx global>{`
          div[class*="clues"] { background-color: #f3f4f6 !important; padding: 15px !important; border-radius: 8px !important; color: #000000 !important; }
          div[class*="clues"] h3 { color: #000000 !important; font-size: 1.2rem !important; font-weight: 800 !important; margin-bottom: 10px !important; }
          div[class*="clues"] li { color: #1f2937 !important; font-size: 16px !important; font-weight: 600 !important; line-height: 1.5 !important; }
          div[class*="clues"] li span { color: #000000 !important; font-weight: bold !important; }
          svg text { fill: #000000 !important; }
        `}</style>

        <Crossword 
          ref={crosswordRef}
          data={datosCrucigrama} 
          onCellChange={onCellChange}
          theme={{
            gridBackground: '#000000',
            cellBackground: '#ffffff',
            textColor: '#000000',
            focusBackground: '#ffd700',
            highlightBackground: '#bae6fd',
          }}
        />
      </div>
    </div>
  );
}