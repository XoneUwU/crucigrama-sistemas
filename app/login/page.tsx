'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const [esRegistro, setEsRegistro] = useState(false); 

  const [nombre, setNombre] = useState('');
  const [carnet, setCarnet] = useState('');
  const [semestre, setSemestre] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const getEmail = (input: string) => `${input}@sistema.emi`;

  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const soloLetras = val.replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚ\s]/g, '');
    setNombre(soloLetras);
  };

  const handleCarnetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const texto = val.toLowerCase();
    
    // Verificamos si lo que estás escribiendo coincide con el inicio de la contraseña maestra
    // Ejemplo: Si escribes "a", "ad", "adm"... el sistema lo permitirá.
    const esIntentoAdmin = "admindeljuego".startsWith(texto);

    if (esIntentoAdmin) {
        setCarnet(val); // Dejamos pasar las letras si va por buen camino
    } else {
        // Si escribe una letra que NO es parte de "admindeljuego", aplicamos filtro de solo números
        const soloNumeros = val.replace(/[^0-9]/g, '');
        setCarnet(soloNumeros);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: getEmail(carnet),
      password,
    });

    if (error) {
      alert('Credenciales incorrectas.');
      setLoading(false);
    } else {
      // Si es el admin, lo mandamos directo al panel
      if (carnet === 'admindeljuego') {
        router.push('/admin');
      } else {
        router.push('/juego');
      }
      router.refresh();
    }
  };

  const handleSignUp = async () => {
    if (!nombre || !carnet || !password) {
      alert('Llena los datos por favor.');
      return;
    }
    setLoading(true);
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: getEmail(carnet),
      password,
      options: { data: { full_name: nombre } },
    });

    if (authError) {
      alert('Error: ' + authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
        await supabase.auth.signInWithPassword({
            email: getEmail(carnet),
            password,
        });

        // Guardamos perfil (incluso si es admin)
        await supabase
            .from('profiles')
            .update({
                full_name: nombre,
                carnet: carnet,
                semestre: semestre || 'Admin' // Si no puso semestre, ponemos Admin
            })
            .eq('id', authData.user.id);

        alert('¡Cuenta creada con éxito!');
        if (carnet === 'admindeljuego') {
            router.push('/admin');
        } else {
            router.push('/juego');
        }
        router.refresh();
    }
    setLoading(false);
  };

  const inputStyle = "mt-1 w-full px-4 py-2 border border-gray-400 rounded focus:ring-2 focus:ring-blue-600 outline-none bg-white text-black font-bold placeholder-gray-400";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden p-8 border-2 border-blue-800">
        
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-blue-900 uppercase">SISTEMAS EMI</h1>
          <p className="mt-2 text-sm text-gray-700 font-bold">
            {esRegistro ? 'Registro de Usuario' : 'Iniciar Sesión'}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleLogin}>
          
          {esRegistro && (
            <>
              <div className="animate-fade-in-down">
                <label className="block text-sm font-bold text-gray-800">Nombre Completo</label>
                <input type="text" className={inputStyle} placeholder="Ej: Juan Perez" value={nombre} onChange={handleNombreChange} />
              </div>
              {carnet !== 'admindeljuego' && (
                  <div className="animate-fade-in-down">
                    <label className="block text-sm font-bold text-gray-800">Semestre</label>
                    <select className={inputStyle} value={semestre} onChange={(e) => setSemestre(e.target.value)}>
                        <option value="">Selecciona...</option>
                        <option value="3">3º Semestre</option>
                        <option value="4">4º Semestre</option>
                        <option value="5">5º Semestre</option>
                        <option value="6">6º Semestre</option>
                        <option value="7">7º Semestre</option>
                        <option value="8">8º Semestre</option>
                        <option value="9">9º Semestre</option>
                        <option value="10">10º Semestre</option>
                    </select>
                  </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-800">Usuario / Carnet</label>
            <input
              type="text"
              required
              className={inputStyle}
              placeholder="Ej: 1234567"
              value={carnet}
              onChange={handleCarnetChange}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800">Contraseña</label>
            <input
              type="password"
              required
              className={inputStyle}
              placeholder="******"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3 pt-4">
            {esRegistro ? (
              <button type="button" onClick={handleSignUp} disabled={loading} className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded shadow transition">
                {loading ? 'Registrando...' : 'CREAR CUENTA'}
              </button>
            ) : (
              <button type="submit" disabled={loading} className="w-full py-3 px-4 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded shadow transition">
                {loading ? 'Verificando...' : 'INGRESAR'}
              </button>
            )}

            <div className="text-center pt-2 border-t border-gray-200 mt-2">
              <button type="button" onClick={() => setEsRegistro(!esRegistro)} className="text-sm font-bold text-blue-700 hover:underline">
                {esRegistro ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate aquí'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}