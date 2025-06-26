import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import Dashboard from './Dashboard';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const initialTeamRow = {
  rut: '',
  nombre: '',
  cargo: '',
  codigoEquipo: '',
  tipoAsist: '', // tipo de asistencia
  tramo: '',
  workerId: '',
  tramoId: '',
  activityId: '',
  duracion: ''
};

const API_URL = process.env.REACT_APP_API_URL;

const App = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [reports, setReports] = useState([]);
  const [avances, setAvances] = useState('');
  const [interferencias, setInterferencias] = useState('');
  const [detenciones, setDetenciones] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [loading, setLoading] = useState(false);
  const [networkError, setNetworkError] = useState('');
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light';
  });
  const [showRegister, setShowRegister] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('user');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Declaración de variables de estado faltantes para evitar errores de no definidas
  const [role, setRole] = useState('');
  const [team, setTeam] = useState([{ ...initialTeamRow }]);
  const [area, setArea] = useState('');
  const [jornada, setJornada] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false); // NUEVO: Estado para el panel admin

  // NUEVO: Hooks para cargar catálogos
  const [catalogActivities, setCatalogActivities] = useState([]);
  const [catalogTramos, setCatalogTramos] = useState([]);
  const [catalogWorkers, setCatalogWorkers] = useState([]);
  const [catalogSupervisors, setCatalogSupervisors] = useState([]);

  // 1. Obtener lista única de cargos existentes
  const uniqueCargos = Array.from(new Set(catalogWorkers.map(w => w.cargo))).filter(Boolean);
  const [catalogCargos, setCatalogCargos] = useState(uniqueCargos);
  
  useEffect(() => {
    setCatalogCargos(Array.from(new Set(catalogWorkers.map(w => w.cargo))).filter(Boolean));
  }, [catalogWorkers]);

  const tipoAsistenciaOptions = [
    { value: 'EO', label: 'EO', definition: 'En obra' },
    { value: 'D', label: 'D', definition: 'Descanso' },
    { value: 'A', label: 'A', definition: 'Ausente' },
    { value: 'P', label: 'P', definition: 'Permiso' },
    { value: 'PP', label: 'PP', definition: 'Permiso Pagado' },
    { value: 'E', label: 'E', definition: 'Enfermo' },
    { value: 'LM', label: 'LM', definition: 'Licencia' },
    { value: 'C', label: 'C', definition: 'Curso' },
    { value: 'F', label: 'F', definition: 'Finiquitado' },
    { value: 'R', label: 'R', definition: 'Rechazado' },
    { value: 'T', label: 'T', definition: 'Traspaso' }
  ];

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedRole = localStorage.getItem('role');
    if (savedToken && savedRole) {
      setToken(savedToken);
      setRole(savedRole);
    }
  }, []);

  useEffect(() => {
    if (token) {
      if (role === 'admin') {
        fetchAllReports(token);
      } else {
        fetchReports(token);
      }
    }
  }, [token, role]);

  // NUEVO: Cargar catálogos al iniciar sesión
  useEffect(() => {
    if (!token) return;
    axios.get(`${API_URL}/catalog/activities`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setCatalogActivities(res.data)).catch(() => {});
    axios.get(`${API_URL}/catalog/tramos`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setCatalogTramos(res.data)).catch(() => {});
    axios.get(`${API_URL}/catalog/workers`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setCatalogWorkers(res.data)).catch(() => {});
    axios.get(`${API_URL}/catalog/supervisors`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setCatalogSupervisors(res.data)).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (token) {
      if (role === 'admin') {
        fetchAllReports(token);
      } else {
        fetchReports(token);
      }
    }
  }, [token, role]);

  // Guardar el modo en localStorage cuando cambia
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogin = async () => {
    setLoading(true);
    setNetworkError('');
    setLoginError('');
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { username, password });
      setToken(response.data.token);
      setRole(response.data.role);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
    } catch (error) {
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        setNetworkError('No se pudo conectar con el servidor. Verifica tu conexión o que el backend esté funcionando.');
      } else if (error.response && error.response.data && error.response.data.message) {
        setLoginError(error.response.data.message);
      } else {
        setLoginError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setRole('');
    setReports([]);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  };

  const handleTeamChange = (idx, field, value) => {
    setTeam(prev => {
      const updated = [...prev];
      updated[idx][field] = value;
      return updated;
    });
  };

  const handleAddTeamRow = () => {
    setTeam(prev => [...prev, { ...initialTeamRow }]);
  };

  const handleRemoveTeamRow = (idx) => {
    setTeam(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  };

  const handleReportSubmit = async () => {
    // Validación básica
    if (!area.trim() || !jornada.trim() || !supervisor.trim()) {
      alert('Debes completar obra, jornada y supervisor.');
      return;
    }
    if (team.length === 0 || team.every(row => Object.values(row).every(val => !val))) {
      alert('Debes ingresar al menos un integrante del equipo.');
      return;
    }
    
    // Filtrar filas vacías
    const filteredTeam = team.filter(row => Object.values(row).some(val => val))
      .map(row => {
        // Buscar el nombre de la actividad según el id seleccionado
        const actividadObj = catalogActivities.find(a => a.id === row.activityId || a._id === row.activityId);
        console.log('Actividad buscada:', { activityId: row.activityId, actividadObj, catalogActivities });
        return {
          ...row,
          actividad: actividadObj ? actividadObj.nombre : '',
        };
      });
    
    // Preparar datos simples (solo enviar si tienen contenido)
    const reportData = {
      area,
      jornada,
      supervisor,
      team: filteredTeam,
      avances: avances.trim() ? [{ descripcion: avances.trim() }] : [],
      interferencias: interferencias.trim() ? [{ descripcion: interferencias.trim() }] : [],
      detenciones: detenciones.trim() ? [{ descripcion: detenciones.trim() }] : [],
      comentarios: comentarios.trim() ? [{ descripcion: comentarios.trim() }] : []
    };
    
    console.log('Enviando datos:', reportData);
    console.log('Equipo filtrado:', filteredTeam);
    console.log('Catálogo de actividades actual:', catalogActivities);
    
    setLoading(true);
    setNetworkError('');
    try {
      await axios.post(`${API_URL}/reports`, reportData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Resetear formulario
      setArea('');
      setJornada('');
      setSupervisor('');
      setTeam([{ ...initialTeamRow }]);
      setAvances('');
      setInterferencias('');
      setDetenciones('');
      setComentarios('');
      
      alert('Informe enviado correctamente');
      
      if (role === 'admin') {
        fetchAllReports(token);
      } else {
        fetchReports(token);
      }
    } catch (error) {
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        setNetworkError('No se pudo conectar con el servidor. Verifica tu conexión o que el backend esté funcionando.');
      } else {
        alert('Error al enviar el informe: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async (token) => {
    setLoading(true);
    setNetworkError('');
    try {
      const response = await axios.get(`${API_URL}/myreports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(response.data);
    } catch (error) {
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        setNetworkError('No se pudo conectar con el servidor. Verifica tu conexión o que el backend esté funcionando.');
      } else {
        alert('Error al obtener informes: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAllReports = async (token) => {
    setLoading(true);
    setNetworkError('');
    try {
      const response = await axios.get(`${API_URL}/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(response.data);
    } catch (error) {
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        setNetworkError('No se pudo conectar con el servidor. Verifica tu conexión o que el backend esté funcionando.');
      } else {
        alert('Error al obtener informes de administrador: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  // Estado para el modal de confirmación de borrado
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);

  // Eliminar informe
  const handleDeleteReport = async () => {
    if (!reportToDelete) return;
    setLoading(true);
    setNetworkError('');
    try {
      await axios.delete(`${API_URL}/reports/${reportToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowDeleteModal(false);
      setReportToDelete(null);
      if (role === 'admin') {
        await fetchAllReports(token);
      } else {
        await fetchReports(token);
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        alert('Error al eliminar el informe: ' + error.response.data.message);
      } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        setNetworkError('No se pudo conectar con el servidor. Verifica tu conexión o que el backend esté funcionando.');
      } else {
        alert('Error al eliminar el informe: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regUsername.trim() || !regPassword.trim() || !regRole) {
      alert('Completa todos los campos de registro.');
      return;
    }
    setRegisterLoading(true);
    setNetworkError('');
    try {
      await axios.post(`${API_URL}/auth/register`, {
        username: regUsername,
        password: regPassword,
        role: regRole
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Usuario registrado correctamente');
      setRegUsername('');
      setRegPassword('');
      setRegRole('user');
      setShowRegister(false);
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        alert('Error al registrar: ' + error.response.data.message);
      } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        setNetworkError('No se pudo conectar con el servidor. Verifica tu conexión o que el backend esté funcionando.');
      } else {
        alert('Error al registrar: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  // Estado para modals del panel admin
  const [adminModal, setAdminModal] = useState(null); // 'actividad' | 'tramo' | 'trabajador' | null
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Estado para el modal de gestión general
  const [showManageModal, setShowManageModal] = useState(false);

  // --- Manejo de cierre de sesión por inactividad con modal y temporizador ---
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [inactivitySeconds, setInactivitySeconds] = useState(30);

  // Prevenir scroll del body cuando hay modales abiertos
  // NO incluimos adminModal aquí porque los subpaneles del admin no deben bloquear el scroll
  useEffect(() => {
    const isModalOpen = showDeleteModal || showInactivityModal || showManageModal;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showDeleteModal, showInactivityModal, showManageModal]);
  const timeoutRef = useRef(null);
  const countdownRef = useRef(null);
  
  const startCountdown = useCallback(() => {
    setInactivitySeconds(30);
    setShowInactivityModal(true);
    countdownRef.current = setInterval(() => {
      setInactivitySeconds(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          setShowInactivityModal(false);
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const resetTimer = useCallback(() => {
    // Limpiar temporizador principal
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // Limpiar countdown si está activo
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    // Ocultar modal si está visible
    setShowInactivityModal(false);
    setInactivitySeconds(30);
    // Reiniciar temporizador principal
    timeoutRef.current = setTimeout(startCountdown, 10 * 60 * 1000); // 10 minutos
  }, [startCountdown]);

  useEffect(() => {
    if (!token) return;
    
    // Eventos que reinician el temporizador
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer(); // Inicializar
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [token, resetTimer]);

  // Exportar informes a Excel (una fila por integrante del equipo, con nombre, rut y cargo separados)
  const exportToExcel = () => {
    if (!reports || reports.length === 0) return;
    const data = [];
    reports.forEach(report => {
      (report.team || [{}]).forEach(row => {
        data.push({
          'Usuario': report.username || '',
          'Obra': report.area,
          'Jornada': report.jornada,
          'Supervisor': report.supervisor,
          'Fecha de Envío': new Date(report.dateSubmitted).toLocaleString(),
          'Nombre Trabajador': row.nombre || '',
          'RUT Trabajador': row.rut || '',
          'Cargo Trabajador': row.cargo || '',
          'Código Equipo': row.codigoEquipo || '',
          'Tipo de Asistencia': row.tipoAsist || '',
          'Tramo': row.tramo || (catalogTramos.find(t => t.id === row.tramoId || t._id === row.tramoId)?.nombre || ''),
          'Actividad': (catalogActivities.find(a => a.id === row.activityId || a._id === row.activityId)?.nombre || row.activityId || ''),
          'Duración': row.duracion || '',
          'Avances': (report.avances || []).map(a => a.descripcion).join('; '),
          'Interferencias': (report.interferencias || []).map(i => i.descripcion).join('; '),
          'Detenciones': (report.detenciones || []).map(d => d.descripcion).join('; '),
          'Comentarios': (report.comentarios || []).map(c => c.descripcion).join('; ')
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Informes');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), 'informes.xlsx');
  };

  return (
    <Router>
      {showInactivityModal && (
        <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.4)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',padding:32,borderRadius:12,minWidth:320,boxShadow:'0 2px 16px 0 rgba(44,62,80,0.18)',textAlign:'center'}}>
            <h3>Sesión a punto de cerrarse por inactividad</h3>
            <p>¿Deseas continuar? Tienes <span style={{fontWeight:'bold',color:'#d63031',fontSize:22}}>{inactivitySeconds}</span> segundos para responder.</p>
            <div style={{marginTop:24,display:'flex',gap:16,justifyContent:'center'}}>
              <button className="btn-primary" onClick={resetTimer}>Seguir conectado</button>
            </div>
          </div>
        </div>
      )}
      <div className={`main-container${theme === 'dark' ? ' dark' : ''}`}>
        {/* NUEVO: Barra de botones superior */}
        {token && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            {/* Izquierda: Solo Ver Dashboard si no está en /dashboard */}
            <div style={{ display: 'flex', gap: 12 }}>
              {role === 'admin' && !window.location.pathname.startsWith('/dashboard') && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ minWidth: 120 }}
                  onClick={() => window.location.href = '/dashboard'}
                >
                  Ver Dashboard
                </button>
              )}
            </div>
            {/* Derecha: Modo Noche y Cerrar Sesión (siempre visibles) */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={toggleTheme}
                style={{ minWidth: 120 }}
              >
                {theme === 'light' ? '🌙 Modo Noche' : '☀️ Modo Día'}
              </button>
              <button
                onClick={handleLogout}
                className="btn-danger"
                style={{ minWidth: 120 }}
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        )}
        {/* FIN NUEVO */}
        <Routes>
          <Route path="/dashboard" element={
            token && role === 'admin' ? (
              <Dashboard theme={theme} />
            ) : <div style={{padding:40, textAlign:'center'}}><h2>Acceso denegado</h2><p>Solo los administradores pueden ver el dashboard.</p></div>
          } />
          <Route path="/" element={
            <div>
              <div className="branding">
                <h1 className="main-title">ICAFAL</h1>
                <div className="subtitle">Minería y Montajes</div>
              </div>
              {networkError && <div className="error-box">{networkError}</div>}
              {loading && <div className="loading-box">Cargando...</div>}
              {!token ? (
                <div className="login-box">
                  {loginError && (
                    <div className="error-box">{loginError}</div>
                  )}
                  <input
                    type="text"
                    placeholder="Usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input"
                  />
                  <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                  />
                  <button
                    onClick={handleLogin}
                    className="btn-primary"
                  >
                    Iniciar Sesión
                  </button>
                </div>
              ) : (
                <>
                  {/* Tabla de Administración - Responsive */}
                  {role === 'admin' && !window.location.pathname.startsWith('/dashboard') && (
                    <div style={{ marginBottom: 24 }}>
                      {/* Versión Desktop */}
                      <div className="admin-table-desktop" style={{ 
                        display: 'block',
                        '@media (max-width: 768px)': { display: 'none' }
                      }}>
                        <table style={{ 
                          width: '100%', 
                          borderCollapse: 'collapse', 
                          background: theme === 'dark' ? '#232a36' : '#fff', 
                          borderRadius: '8px', 
                          overflow: 'hidden', 
                          boxShadow: '0 2px 8px 0 rgba(44,62,80,0.1)',
                          border: theme === 'dark' ? '1px solid #3d4b5c' : '1px solid #e0e6ef'
                        }}>
                          <tbody>
                            <tr>
                              <td
                                onClick={() => {
                                  if (showRegister) {
                                    setShowRegister(false);
                                  } else {
                                    setShowRegister(true);
                                    setShowAdminPanel(false);
                                  }
                                }}
                                className={`admin-table-cell ${showRegister ? 'active' : ''}`}
                                style={{
                                  padding: '20px',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  fontSize: '16px',
                                  background: showRegister 
                                    ? (theme === 'dark' ? '#1a2332' : '#e8f4f8')
                                    : (theme === 'dark' ? '#2c3440' : '#f5f8fa'),
                                  color: showRegister 
                                    ? (theme === 'dark' ? '#7ed6df' : '#0984e3')
                                    : (theme === 'dark' ? '#b8c5d1' : '#5a6c7d'),
                                  border: showRegister
                                    ? (theme === 'dark' ? '2px solid #7ed6df' : '2px solid #0984e3')
                                    : (theme === 'dark' ? '1px solid #3d4b5c' : '1px solid #ddd'),
                                  transition: 'all 0.3s ease',
                                  userSelect: 'none',
                                  boxShadow: showRegister 
                                    ? '0 4px 12px 0 rgba(44,62,80,0.15)' 
                                    : '0 2px 4px 0 rgba(44,62,80,0.05)',
                                  transform: showRegister ? 'translateY(-1px)' : 'translateY(0)'
                                }}
                              >
                                👤 Registrar Usuario
                              </td>
                              <td
                                onClick={() => {
                                  if (showAdminPanel) {
                                    setShowAdminPanel(false);
                                  } else {
                                    setShowAdminPanel(true);
                                    setShowRegister(false);
                                    setAdminModal(''); // Resetear selección de subpanel al abrir
                                  }
                                }}
                                className={`admin-table-cell ${showAdminPanel ? 'active' : ''}`}
                                style={{
                                  padding: '20px',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  fontSize: '16px',
                                  background: showAdminPanel 
                                    ? (theme === 'dark' ? '#1a2332' : '#e8f4f8')
                                    : (theme === 'dark' ? '#2c3440' : '#f5f8fa'),
                                  color: showAdminPanel 
                                    ? (theme === 'dark' ? '#7ed6df' : '#0984e3')
                                    : (theme === 'dark' ? '#b8c5d1' : '#5a6c7d'),
                                  border: showAdminPanel
                                    ? (theme === 'dark' ? '2px solid #7ed6df' : '2px solid #0984e3')
                                    : (theme === 'dark' ? '1px solid #3d4b5c' : '1px solid #ddd'),
                                  transition: 'all 0.3s ease',
                                  userSelect: 'none',
                                  boxShadow: showAdminPanel 
                                    ? '0 4px 12px 0 rgba(44,62,80,0.15)' 
                                    : '0 2px 4px 0 rgba(44,62,80,0.05)',
                                  transform: showAdminPanel ? 'translateY(-1px)' : 'translateY(0)'
                                }}
                              >
                                ⚙️ Panel de Administración
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Versión Mobile - Botones apilados */}
                      <div className="admin-table-mobile" style={{ 
                        display: 'none',
                        '@media (max-width: 768px)': { display: 'block' }
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <button
                            onClick={() => {
                              if (showRegister) {
                                setShowRegister(false);
                              } else {
                                setShowRegister(true);
                                setShowAdminPanel(false);
                              }
                            }}
                            style={{
                              padding: '16px 20px',
                              textAlign: 'center',
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '16px',
                              background: showRegister 
                                ? (theme === 'dark' ? '#1a2332' : '#e8f4f8')
                                : (theme === 'dark' ? '#2c3440' : '#f5f8fa'),
                              color: showRegister 
                                ? (theme === 'dark' ? '#7ed6df' : '#0984e3')
                                : (theme === 'dark' ? '#b8c5d1' : '#5a6c7d'),
                              border: showRegister
                                ? (theme === 'dark' ? '2px solid #7ed6df' : '2px solid #0984e3')
                                : (theme === 'dark' ? '1px solid #3d4b5c' : '1px solid #ddd'),
                              borderRadius: '8px',
                              transition: 'all 0.3s ease',
                              userSelect: 'none',
                              boxShadow: showRegister 
                                ? '0 4px 12px 0 rgba(44,62,80,0.15)' 
                                : '0 2px 4px 0 rgba(44,62,80,0.05)',
                              transform: showRegister ? 'translateY(-1px)' : 'translateY(0)',
                              width: '100%',
                              minHeight: '60px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            👤 Registrar Usuario
                          </button>
                          <button
                            onClick={() => {
                              if (showAdminPanel) {
                                setShowAdminPanel(false);
                              } else {
                                setShowAdminPanel(true);
                                setShowRegister(false);
                                setAdminModal(''); // Resetear selección de subpanel al abrir
                              }
                            }}
                            style={{
                              padding: '16px 20px',
                              textAlign: 'center',
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '16px',
                              background: showAdminPanel 
                                ? (theme === 'dark' ? '#1a2332' : '#e8f4f8')
                                : (theme === 'dark' ? '#2c3440' : '#f5f8fa'),
                              color: showAdminPanel 
                                ? (theme === 'dark' ? '#7ed6df' : '#0984e3')
                                : (theme === 'dark' ? '#b8c5d1' : '#5a6c7d'),
                              border: showAdminPanel
                                ? (theme === 'dark' ? '2px solid #7ed6df' : '2px solid #0984e3')
                                : (theme === 'dark' ? '1px solid #3d4b5c' : '1px solid #ddd'),
                              borderRadius: '8px',
                              transition: 'all 0.3s ease',
                              userSelect: 'none',
                              boxShadow: showAdminPanel 
                                ? '0 4px 12px 0 rgba(44,62,80,0.15)' 
                                : '0 2px 4px 0 rgba(44,62,80,0.05)',
                              transform: showAdminPanel ? 'translateY(-1px)' : 'translateY(0)',
                              width: '100%',
                              minHeight: '60px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            ⚙️ Panel de Administración
                          </button>
                        </div>
                      </div>
                      {/* Formulario de Registro - Panel Expandible */}
                      {showRegister && (
                        <div 
                          className="admin-panel"
                          style={{
                            marginTop: '16px',
                            background: theme === 'dark' ? '#273043' : '#f8f9fa',
                            padding: '24px',
                            borderRadius: '8px',
                            border: theme === 'dark' ? '1px solid #3d4b5c' : '1px solid #e0e6ef',
                            boxShadow: '0 4px 12px 0 rgba(44,62,80,0.1)',
                            animation: 'fadeIn 0.3s ease'
                          }}
                        >
                          <h3 style={{ 
                            margin: '0 0 20px 0', 
                            color: theme === 'dark' ? '#7ed6df' : '#2c3e50',
                            fontSize: '18px',
                            fontWeight: '600'
                          }}>
                            📝 Registrar Nuevo Usuario
                          </h3>
                          <form onSubmit={handleRegister}>
                            <div className="row">
                              <div className="col">
                                <input
                                  type="text"
                                  placeholder="Usuario"
                                  value={regUsername}
                                  onChange={e => setRegUsername(e.target.value)}
                                  className="input"
                                />
                              </div>
                              <div className="col">
                                <input
                                  type="password"
                                  placeholder="Contraseña"
                                  value={regPassword}
                                  onChange={e => setRegPassword(e.target.value)}
                                  className="input"
                                />
                              </div>
                              <div className="col">
                                <select
                                  value={regRole}
                                  onChange={e => setRegRole(e.target.value)}
                                  className="input"
                                >
                                  <option value="user">Usuario</option>
                                  <option value="admin">Administrador</option>
                                </select>
                              </div>
                              <div className="col">
                                <button
                                  type="submit"
                                  className="btn-success"
                                  disabled={registerLoading}
                                  style={{ minWidth: 120 }}
                                >
                                  {registerLoading ? 'Registrando...' : 'Registrar'}
                                </button>
                              </div>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Panel de Administración - Panel Expandible */}
                      {showAdminPanel && (
                        <div 
                          className="admin-panel"
                          style={{
                            marginTop: '16px',
                            background: theme === 'dark' ? '#273043' : '#f8f9fa',
                            padding: '24px',
                            borderRadius: '8px',
                            border: theme === 'dark' ? '1px solid #3d4b5c' : '1px solid #e0e6ef',
                            boxShadow: '0 4px 12px 0 rgba(44,62,80,0.1)',
                            animation: 'fadeIn 0.3s ease'
                          }}
                        >
                          <h3 style={{ 
                            margin: '0 0 20px 0', 
                            color: theme === 'dark' ? '#7ed6df' : '#2c3e50',
                            fontSize: '18px',
                            fontWeight: '600'
                          }}>
                            🔧 Panel de Administración
                          </h3>
                          <div 
                            className="admin-panel-buttons"
                            style={{ 
                              display: 'flex', 
                              gap: 16, 
                              marginBottom: 16, 
                              flexWrap: 'wrap', 
                              flexDirection: 'row', 
                              justifyContent: 'flex-start' 
                            }}
                          >
                            <button type="button" className={`btn-primary ${adminModal === 'actividad' ? 'active' : ''}`} style={{ minWidth: 120, flex: '1 1 auto' }} onClick={() => setAdminModal(adminModal === 'actividad' ? null : 'actividad')}>📋 Actividad</button>
                            <button type="button" className={`btn-primary ${adminModal === 'tramo' ? 'active' : ''}`} style={{ minWidth: 120, flex: '1 1 auto' }} onClick={() => setAdminModal(adminModal === 'tramo' ? null : 'tramo')}>🛤️ Tramo</button>
                            <button type="button" className={`btn-primary ${adminModal === 'trabajador' ? 'active' : ''}`} style={{ minWidth: 120, flex: '1 1 auto' }} onClick={() => setAdminModal(adminModal === 'trabajador' ? null : 'trabajador')}>👷 Trabajador</button>
                            <button type="button" className={`btn-primary ${adminModal === 'supervisor' ? 'active' : ''}`} style={{ minWidth: 120, flex: '1 1 auto' }} onClick={() => setAdminModal(adminModal === 'supervisor' ? null : 'supervisor')}>👨‍💼 Supervisor</button>
                          </div>
                          
                          {/* Panel expandido para Actividad */}
                          {adminModal === 'actividad' && (
                            <div style={{ 
                              background: theme === 'dark' ? '#1e252d' : '#ffffff', 
                              padding: '28px', 
                              borderRadius: '12px', 
                              border: theme === 'dark' ? '1.5px solid #3d4b5c' : '1.5px solid #e0e6ef',
                              boxShadow: '0 4px 20px 0 rgba(44,62,80,0.12)',
                              marginTop: '20px'
                            }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                marginBottom: '24px',
                                paddingBottom: '16px',
                                borderBottom: theme === 'dark' ? '2px solid #3d4b5c' : '2px solid #e0e6ef'
                              }}>
                                <div>
                                  <h3 style={{ 
                                    margin: 0, 
                                    color: theme === 'dark' ? '#7ed6df' : '#2c3e50',
                                    fontSize: '20px',
                                    fontWeight: '600'
                                  }}>📋 Gestión de Actividades</h3>
                                  <p style={{ 
                                    margin: '4px 0 0 0', 
                                    color: theme === 'dark' ? '#b8c5d1' : '#6c757d',
                                    fontSize: '14px'
                                  }}>Administra las actividades disponibles en el sistema</p>
                                </div>
                                <button 
                                  type="button" 
                                  className="btn-primary" 
                                  style={{ 
                                    minWidth: 140, 
                                    height: '42px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                  }} 
                                  onClick={() => setShowManageModal(true)}
                                >
                                  ➕ Agregar Nueva
                                </button>
                              </div>
                              {catalogActivities.length === 0 ? (
                                <div style={{ 
                                  textAlign: 'center', 
                                  padding: '40px 20px',
                                  color: theme === 'dark' ? '#b8c5d1' : '#6c757d',
                                  fontSize: '16px'
                                }}>
                                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                                  <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>No hay actividades registradas</p>
                                  <p style={{ margin: 0, fontSize: '14px' }}>Comienza agregando tu primera actividad</p>
                                </div>
                              ) : (
                                <div>
                                  <div style={{ 
                                    marginBottom: '16px', 
                                    color: theme === 'dark' ? '#b8c5d1' : '#6c757d',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                  }}>
                                    Total de actividades: {catalogActivities.length}
                                  </div>
                                  <div className="admin-table-container" style={{ 
                                    maxHeight: '400px', 
                                    overflowY: 'auto',
                                    overflowX: 'auto',
                                    borderRadius: '8px',
                                    border: theme === 'dark' ? '1px solid #3d4b5c' : '1px solid #e0e6ef'
                                  }}>
                                    <table style={{ 
                                      width: '100%',
                                      minWidth: '300px',
                                      borderCollapse: 'collapse', 
                                      background: theme === 'dark' ? '#232a36' : '#ffffff',
                                      tableLayout: 'fixed'
                                    }}>
                                      <thead>
                                        <tr style={{ background: theme === 'dark' ? '#273043' : '#f8f9fa' }}>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontWeight: 700, 
                                            fontSize: '13px', 
                                            color: theme === 'dark' ? '#7ed6df' : '#2c3e50', 
                                            border: 'none',
                                            textAlign: 'left',
                                            letterSpacing: '0.3px',
                                            width: '65%'
                                          }}>NOMBRE</th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontWeight: 700, 
                                            fontSize: '13px', 
                                            color: theme === 'dark' ? '#7ed6df' : '#2c3e50', 
                                            border: 'none',
                                            textAlign: 'center',
                                            letterSpacing: '0.3px',
                                            width: '35%'
                                          }}>ACCIÓN</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {catalogActivities.map((activity, idx) => (
                                          <tr key={activity._id || activity.id} style={{ 
                                            background: idx % 2 === 0 ? (theme === 'dark' ? '#232a36' : '#ffffff') : (theme === 'dark' ? '#273043' : '#f8f9fa'),
                                            transition: 'background-color 0.2s ease'
                                          }}>
                                            <td style={{ 
                                              border: 'none', 
                                              padding: '12px 16px', 
                                              fontSize: '14px',
                                              color: theme === 'dark' ? '#e0e6ef' : '#2c3e50',
                                              fontWeight: '500',
                                              wordWrap: 'break-word',
                                              overflow: 'hidden'
                                            }}>
                                              {activity.nombre}
                                            </td>
                                            <td style={{ 
                                              border: 'none', 
                                              padding: '12px 16px', 
                                              textAlign: 'center' 
                                            }}>
                                              <button 
                                                type="button" 
                                                className="btn-danger" 
                                                style={{ 
                                                  width: '70px',
                                                  fontSize: '11px', 
                                                  padding: '4px 6px',
                                                  borderRadius: '4px',
                                                  fontWeight: '500',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  gap: '3px',
                                                  margin: '0 auto'
                                                }}
                                                onClick={async () => {
                                                  if (window.confirm(`¿Estás seguro de eliminar la actividad "${activity.nombre}"?`)) {
                                                    try {
                                                      await axios.delete(`${API_URL}/catalog/activities/${activity._id || activity.id}`, {
                                                        headers: { Authorization: `Bearer ${token}` }
                                                      });
                                                      setCatalogActivities(prev => prev.filter(a => (a._id || a.id) !== (activity._id || activity.id)));
                                                    } catch (err) {
                                                      alert('Error al eliminar actividad: ' + (err.response?.data?.message || err.message));
                                                    }
                                                  }
                                                }}
                                              >
                                                🗑️ Eliminar
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}                          {/* Panel expandido para Tramo */}
                          {adminModal === 'tramo' && (
                            <div style={{ 
                              background: theme === 'dark' ? '#1e252d' : '#ffffff', 
                              padding: '28px', 
                              borderRadius: '12px', 
                              border: theme === 'dark' ? '1.5px solid #3d4b5c' : '1.5px solid #e0e6ef',
                              boxShadow: '0 4px 20px 0 rgba(44,62,80,0.12)',
                              marginTop: '20px'
                            }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                marginBottom: '24px',
                                paddingBottom: '16px',
                                borderBottom: theme === 'dark' ? '2px solid #3d4b5c' : '2px solid #e0e6ef'
                              }}>
                                <div>
                                  <h3 style={{ 
                                    margin: 0, 
                                    color: theme === 'dark' ? '#7ed6df' : '#2c3e50',
                                    fontSize: '20px',
                                    fontWeight: '600'
                                  }}>🛤️ Gestión de Tramos</h3>
                                  <p style={{ 
                                    margin: '4px 0 0 0', 
                                    color: theme === 'dark' ? '#b8c5d1' : '#6c757d',
                                    fontSize: '14px'
                                  }}>Administra los tramos disponibles para las actividades</p>
                                </div>
                                <button 
                                  type="button" 
                                  className="btn-primary" 
                                  style={{ 
                                    minWidth: 140, 
                                    height: '42px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                  }} 
                                  onClick={() => setShowManageModal(true)}
                                >
                                  ➕ Agregar Nuevo
                                </button>
                              </div>
                              {catalogTramos.length === 0 ? (
                                <div style={{ 
                                  textAlign: 'center', 
                                  padding: '40px 20px',
                                  color: theme === 'dark' ? '#b8c5d1' : '#6c757d',
                                  fontSize: '16px'
                                }}>
                                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛤️</div>
                                  <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>No hay tramos registrados</p>
                                  <p style={{ margin: 0, fontSize: '14px' }}>Comienza agregando tu primer tramo</p>
                                </div>
                              ) : (
                                <div>
                                  <div style={{ 
                                    marginBottom: '16px', 
                                    color: theme === 'dark' ? '#b8c5d1' : '#6c757d',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                  }}>
                                    Total de tramos: {catalogTramos.length}
                                  </div>
                                  <div className="admin-table-container" style={{ 
                                    maxHeight: '400px', 
                                    overflowY: 'auto',
                                    overflowX: 'auto',
                                    borderRadius: '8px',
                                    border: theme === 'dark' ? '1px solid #3d4b5c' : '1px solid #e0e6ef'
                                  }}>
                                    <table style={{ 
                                      width: '100%',
                                      minWidth: '300px',
                                      borderCollapse: 'collapse', 
                                      background: theme === 'dark' ? '#232a36' : '#ffffff',
                                      tableLayout: 'fixed'
                                    }}>
                                      <thead>
                                        <tr style={{ background: theme === 'dark' ? '#273043' : '#f8f9fa' }}>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontWeight: 700, 
                                            fontSize: '13px', 
                                            color: theme === 'dark' ? '#7ed6df' : '#2c3e50', 
                                            border: 'none',
                                            textAlign: 'left',
                                            letterSpacing: '0.3px',
                                            width: '65%'
                                          }}>NOMBRE</th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontWeight: 700, 
                                            fontSize: '13px', 
                                            color: theme === 'dark' ? '#7ed6df' : '#2c3e50', 
                                            border: 'none',
                                            textAlign: 'center',
                                            letterSpacing: '0.3px',
                                            width: '35%'
                                          }}>ACCIÓN</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {catalogTramos.map((tramo, idx) => (
                                          <tr key={tramo._id || tramo.id} style={{ 
                                            background: idx % 2 === 0 ? (theme === 'dark' ? '#232a36' : '#ffffff') : (theme === 'dark' ? '#273043' : '#f8f9fa'),
                                            transition: 'background-color 0.2s ease'
                                          }}>
                                            <td style={{ 
                                              border: 'none', 
                                              padding: '12px 16px', 
                                              fontSize: '14px',
                                              color: theme === 'dark' ? '#e0e6ef' : '#2c3e50',
                                              fontWeight: '500',
                                              wordWrap: 'break-word',
                                              overflow: 'hidden'
                                            }}>
                                              {tramo.nombre}
                                            </td>
                                            <td style={{ 
                                              border: 'none', 
                                              padding: '12px 16px', 
                                              textAlign: 'center' 
                                            }}>
                                              <button 
                                                type="button" 
                                                className="btn-danger" 
                                                style={{ 
                                                  width: '70px',
                                                  fontSize: '11px', 
                                                  padding: '4px 6px',
                                                  borderRadius: '4px',
                                                  fontWeight: '500',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  gap: '3px',
                                                  margin: '0 auto'
                                                }}
                                                onClick={async () => {
                                                  if (window.confirm(`¿Estás seguro de eliminar el tramo "${tramo.nombre}"?`)) {
                                                    try {
                                                      await axios.delete(`${API_URL}/catalog/tramos/${tramo._id || tramo.id}`, {
                                                        headers: { Authorization: `Bearer ${token}` }
                                                      });
                                                      setCatalogTramos(prev => prev.filter(t => (t._id || t.id) !== (tramo._id || tramo.id)));
                                                    } catch (err) {
                                                      alert('Error al eliminar tramo: ' + (err.response?.data?.message || err.message));
                                                    }
                                                  }
                                                }}
                                              >
                                                🗑️ Eliminar
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Panel expandido para Trabajador */}
                          {adminModal === 'trabajador' && (
                            <div style={{ 
                              background: theme === 'dark' ? '#1e252d' : '#ffffff', 
                              padding: '28px', 
                              borderRadius: '12px', 
                              border: theme === 'dark' ? '1.5px solid #3d4b5c' : '1.5px solid #e0e6ef',
                              boxShadow: '0 4px 20px 0 rgba(44,62,80,0.12)',
                              marginTop: '20px'
                            }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                marginBottom: '24px',
                                paddingBottom: '16px',
                                borderBottom: theme === 'dark' ? '2px solid #3d4b5c' : '2px solid #e0e6ef'
                              }}>
                                <div>
                                  <h3 style={{ 
                                    margin: 0, 
                                    color: theme === 'dark' ? '#7ed6df' : '#2c3e50',
                                    fontSize: '20px',
                                    fontWeight: '600'
                                  }}>👷 Gestión de Trabajadores</h3>
                                  <p style={{ 
                                    margin: '4px 0 0 0', 
                                    color: theme === 'dark' ? '#b8c5d1' : '#6c757d',
                                    fontSize: '14px'
                                  }}>Administra el personal de trabajo registrado</p>
                                </div>
                                <button 
                                  type="button" 
                                  className="btn-primary" 
                                  style={{ 
                                    minWidth: 140, 
                                    height: '42px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                  }} 
                                  onClick={() => setShowManageModal(true)}
                                >
                                  ➕ Agregar Nuevo
                                </button>
                              </div>
                              {catalogWorkers.length === 0 ? (
                                <div style={{ 
                                  textAlign: 'center', 
                                  padding: '40px 20px',
                                  color: theme === 'dark' ? '#b8c5d1' : '#6c757d',
                                  fontSize: '16px'
                                }}>
                                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>👷</div>
                                  <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>No hay trabajadores registrados</p>
                                  <p style={{ margin: 0, fontSize: '14px' }}>Comienza agregando tu primer trabajador</p>
                                </div>
                              ) : (
                                <div>
                                  <div style={{ 
                                    marginBottom: '16px', 
                                    color: theme === 'dark' ? '#b8c5d1' : '#6c757d',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                  }}>
                                    Total de trabajadores: {catalogWorkers.length}
                                  </div>
                                  <div style={{ 
                                    maxHeight: '400px', 
                                    overflowY: 'auto',
                                    overflowX: 'auto',
                                    borderRadius: '8px',
                                    border: theme === 'dark' ? '1px solid #3d4b5c' : '1px solid #e0e6ef'
                                  }}>
                                    <table style={{ 
                                      width: '100%',
                                      minWidth: '550px',
                                      borderCollapse: 'collapse', 
                                      background: theme === 'dark' ? '#232a36' : '#ffffff',
                                      tableLayout: 'fixed'
                                    }}>
                                      <thead>
                                        <tr style={{ background: theme === 'dark' ? '#273043' : '#f8f9fa' }}>
                                          <th style={{ 
                                            padding: '12px 10px', 
                                            fontWeight: 700, 
                                            fontSize: '12px', 
                                            color: theme === 'dark' ? '#7ed6df' : '#2c3e50', 
                                            border: 'none',
                                            textAlign: 'left',
                                            letterSpacing: '0.3px',
                                            width: '40%'
                                          }}>NOMBRE</th>
                                          <th style={{ 
                                            padding: '12px 10px', 
                                            fontWeight: 700, 
                                            fontSize: '12px', 
                                            color: theme === 'dark' ? '#7ed6df' : '#2c3e50', 
                                            border: 'none',
                                            textAlign: 'left',
                                            letterSpacing: '0.3px',
                                            width: '28%'
                                          }}>RUT</th>
                                          <th style={{ 
                                            padding: '12px 10px', 
                                            fontWeight: 700, 
                                            fontSize: '12px', 
                                            color: theme === 'dark' ? '#7ed6df' : '#2c3e50', 
                                            border: 'none',
                                            textAlign: 'left',
                                            letterSpacing: '0.3px',
                                            width: '22%'
                                          }}>CARGO</th>
                                          <th style={{ 
                                            padding: '12px 10px', 
                                            fontWeight: 700, 
                                            fontSize: '12px', 
                                            color: theme === 'dark' ? '#7ed6df' : '#2c3e50', 
                                            border: 'none',
                                            textAlign: 'center',
                                            letterSpacing: '0.3px',
                                            width: '10%'
                                          }}>ACCIÓN</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {catalogWorkers.map((worker, idx) => (
                                          <tr key={worker._id || worker.id} style={{ 
                                            background: idx % 2 === 0 ? (theme === 'dark' ? '#232a36' : '#ffffff') : (theme === 'dark' ? '#273043' : '#f8f9fa'),
                                            transition: 'background-color 0.2s ease'
                                          }}>
                                            <td style={{ 
                                              border: 'none', 
                                              padding: '12px 10px', 
                                              fontSize: '13px',
                                              color: theme === 'dark' ? '#e0e6ef' : '#2c3e50',
                                              fontWeight: '500',
                                              wordWrap: 'break-word',
                                              overflow: 'hidden'
                                            }}>
                                              {worker.nombre}
                                            </td>
                                            <td style={{ 
                                              border: 'none', 
                                              padding: '12px 10px', 
                                              fontSize: '13px',
                                              color: theme === 'dark' ? '#b8c5d1' : '#6c757d',
                                              fontFamily: 'monospace',
                                              wordWrap: 'break-word'
                                            }}>
                                              {worker.rut}
                                            </td>
                                            <td style={{ 
                                              border: 'none', 
                                              padding: '12px 10px', 
                                              fontSize: '12px',
                                              color: theme === 'dark' ? '#b8c5d1' : '#6c757d'
                                            }}>
                                              <span style={{
                                                background: theme === 'dark' ? '#3d4b5c' : '#e9ecef',
                                                padding: '3px 8px',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: '500',
                                                display: 'inline-block',
                                                textAlign: 'center',
                                                wordWrap: 'break-word'
                                              }}>
                                                {worker.cargo}
                                              </span>
                                            </td>
                                            <td style={{ 
                                              border: 'none', 
                                              padding: '12px 10px', 
                                              textAlign: 'center' 
                                            }}>
                                              <button 
                                                type="button" 
                                                className="btn-danger" 
                                                style={{ 
                                                  width: '60px',
                                                  fontSize: '10px', 
                                                  padding: '4px 5px',
                                                  borderRadius: '4px',
                                                  fontWeight: '500',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  gap: '2px',
                                                  margin: '0 auto'
                                                }}
                                                onClick={async () => {
                                                  if (window.confirm(`¿Estás seguro de eliminar al trabajador "${worker.nombre}"?`)) {
                                                    try {
                                                      await axios.delete(`${API_URL}/catalog/workers/${worker._id || worker.id}`, {
                                                        headers: { Authorization: `Bearer ${token}` }
                                                      });
                                                      setCatalogWorkers(prev => prev.filter(w => (w._id || w.id) !== (worker._id || worker.id)));
                                                    } catch (err) {
                                                      alert('Error al eliminar trabajador: ' + (err.response?.data?.message || err.message));
                                                    }
                                                  }
                                                }}
                                              >
                                                🗑️ Eliminar
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Panel expandido para Supervisor */}
                          {adminModal === 'supervisor' && (
                            <div style={{ 
                              background: theme === 'dark' ? '#1e252d' : '#ffffff', 
                              padding: '28px', 
                              borderRadius: '12px', 
                              border: theme === 'dark' ? '1.5px solid #3d4b5c' : '1.5px solid #e0e6ef',
                              boxShadow: '0 4px 20px 0 rgba(44,62,80,0.12)',
                              marginTop: '20px'
                            }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                marginBottom: '24px',
                                paddingBottom: '16px',
                                borderBottom: theme === 'dark' ? '2px solid #3d4b5c' : '2px solid #e0e6ef'
                              }}>
                                <div>
                                  <h3 style={{ 
                                    margin: 0, 
                                    color: theme === 'dark' ? '#7ed6df' : '#2c3e50',
                                    fontSize: '20px',
                                    fontWeight: '600'
                                  }}>👨‍💼 Gestión de Supervisores</h3>
                                  <p style={{ 
                                    margin: '4px 0 0 0', 
                                    color: theme === 'dark' ? '#b8c5d1' : '#6c757d',
                                    fontSize: '14px'
                                  }}>Administra los supervisores encargados de los proyectos</p>
                                </div>
                                <button 
                                  type="button" 
                                  className="btn-primary" 
                                  style={{ 
                                    minWidth: 140, 
                                    height: '42px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                  }} 
                                  onClick={() => setShowManageModal(true)}
                                >
                                  ➕ Agregar Nuevo
                                </button>
                              </div>
                              {catalogSupervisors.length === 0 ? (
                                <div style={{ 
                                  textAlign: 'center', 
                                  padding: '40px 20px',
                                  color: theme === 'dark' ? '#b8c5d1' : '#6c757d',
                                  fontSize: '16px'
                                }}>
                                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍💼</div>
                                  <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>No hay supervisores registrados</p>
                                  <p style={{ margin: 0, fontSize: '14px' }}>Comienza agregando tu primer supervisor</p>
                                </div>
                              ) : (
                                <div>
                                  <div style={{ 
                                    marginBottom: '16px', 
                                    color: theme === 'dark' ? '#b8c5d1' : '#6c757d',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                  }}>
                                    Total de supervisores: {catalogSupervisors.length}
                                  </div>
                                  <div style={{ 
                                    maxHeight: '400px', 
                                    overflowY: 'auto',
                                    overflowX: 'auto',
                                    borderRadius: '8px',
                                    border: theme === 'dark' ? '1px solid #3d4b5c' : '1px solid #e0e6ef'
                                  }}>
                                    <table style={{ 
                                      width: '100%',
                                      minWidth: '350px',
                                      borderCollapse: 'collapse', 
                                      background: theme === 'dark' ? '#232a36' : '#ffffff',
                                      tableLayout: 'fixed'
                                    }}>
                                      <thead>
                                        <tr style={{ background: theme === 'dark' ? '#273043' : '#f8f9fa' }}>
                                          <th style={{ 
                                            padding: '12px 12px', 
                                            fontWeight: 700, 
                                            fontSize: '13px', 
                                            color: theme === 'dark' ? '#7ed6df' : '#2c3e50', 
                                            border: 'none',
                                            textAlign: 'left',
                                            letterSpacing: '0.3px',
                                            width: '45%'
                                          }}>NOMBRE</th>
                                          <th style={{ 
                                            padding: '12px 12px', 
                                            fontWeight: 700, 
                                            fontSize: '13px', 
                                            color: theme === 'dark' ? '#7ed6df' : '#2c3e50', 
                                            border: 'none',
                                            textAlign: 'left',
                                            letterSpacing: '0.3px',
                                            width: '30%'
                                          }}>RUT</th>
                                          <th style={{ 
                                            padding: '12px 12px', 
                                            fontWeight: 700, 
                                            fontSize: '13px', 
                                            color: theme === 'dark' ? '#7ed6df' : '#2c3e50', 
                                            border: 'none',
                                            textAlign: 'center',
                                            letterSpacing: '0.3px',
                                            width: '25%'
                                          }}>ACCIÓN</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {catalogSupervisors.map((supervisor, idx) => (
                                          <tr key={supervisor._id || supervisor.id} style={{ 
                                            background: idx % 2 === 0 ? (theme === 'dark' ? '#232a36' : '#ffffff') : (theme === 'dark' ? '#273043' : '#f8f9fa'),
                                            transition: 'background-color 0.2s ease'
                                          }}>
                                            <td style={{ 
                                              border: 'none', 
                                              padding: '12px 12px', 
                                              fontSize: '14px',
                                              color: theme === 'dark' ? '#e0e6ef' : '#2c3e50',
                                              fontWeight: '500',
                                              wordWrap: 'break-word',
                                              overflow: 'hidden'
                                            }}>
                                              {supervisor.nombre}
                                            </td>
                                            <td style={{ 
                                              border: 'none', 
                                              padding: '12px 12px', 
                                              fontSize: '13px',
                                              color: theme === 'dark' ? '#b8c5d1' : '#6c757d',
                                              fontFamily: 'monospace',
                                              wordWrap: 'break-word'
                                            }}>
                                              {supervisor.rut}
                                            </td>
                                            <td style={{ 
                                              border: 'none', 
                                              padding: '12px 12px', 
                                              textAlign: 'center' 
                                            }}>
                                              <button 
                                                type="button" 
                                                className="btn-danger" 
                                                style={{ 
                                                  width: '65px',
                                                  fontSize: '10px', 
                                                  padding: '4px 6px',
                                                  borderRadius: '4px',
                                                  fontWeight: '500',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  gap: '2px',
                                                  margin: '0 auto'
                                                }}
                                                onClick={async () => {
                                                  if (window.confirm(`¿Estás seguro de eliminar al supervisor "${supervisor.nombre}"?`)) {
                                                    try {
                                                      await axios.delete(`${API_URL}/catalog/supervisors/${supervisor._id || supervisor.id}`, {
                                                        headers: { Authorization: `Bearer ${token}` }
                                                      });
                                                      setCatalogSupervisors(prev => prev.filter(s => (s._id || s.id) !== (supervisor._id || supervisor.id)));
                                                    } catch (err) {
                                                      alert('Error al eliminar supervisor: ' + (err.response?.data?.message || err.message));
                                                    }
                                                  }
                                                }}
                                              >
                                                🗑️ Eliminar
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Sección Crear Informe */}
                  <div className="header-row">
                    <h2>Crear Informe</h2>
                  </div>
                  <form
                    onSubmit={e => { e.preventDefault(); handleReportSubmit(); }}
                    className="form-section"
                  >
                    <h2>Equipo y Avances</h2>
                    <div className="row">
                      <div className="col">
                        <input type="text" className="input" placeholder="Obra" value={area} onChange={e => setArea(e.target.value)} />
                      </div>
                      <div className="col">
                        <select className="input" value={jornada} onChange={e => setJornada(e.target.value)}>
                          <option value="">Selecciona Jornada</option>
                          <option value="Día">Día</option>
                          <option value="Noche">Noche</option>
                        </select>
                      </div>
                      <div className="col">
                        <select className="input" value={supervisor} onChange={e => setSupervisor(e.target.value)}>
                          <option value="">Selecciona Supervisor</option>
                          {catalogSupervisors.map(s => (
                            <option key={s._id || s.id} value={s.nombre}>{s.nombre}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="table-responsive">
                      <table>
                        <thead>
                          <tr>
                            <th>Trabajador</th>
                            <th>RUT</th>
                            <th>NOMBRE</th>
                            <th>Cargo</th>
                            <th>Tramo</th>
                            <th>Actividad</th>
                            <th>Duración</th>
                            <th>Tipo de Asistencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {team.map((row, idx) => {
                            const uniqueCargos = Array.from(new Set(catalogWorkers.map(w => w.cargo)));
                            return (
                              <React.Fragment key={idx}>
                                <tr>
                                  <td>
                                    <select value={row.workerId || ''} onChange={e => {
                                      const workerId = e.target.value;
                                      const worker = catalogWorkers.find(w => w.id === workerId || w._id === workerId);
                                      handleTeamChange(idx, 'workerId', workerId);
                                      handleTeamChange(idx, 'rut', worker ? worker.rut : '');
                                      handleTeamChange(idx, 'nombre', worker ? worker.nombre : '');
                                      handleTeamChange(idx, 'cargo', worker ? worker.cargo : '');
                                    }} className="input-table">
                                      <option value="">Selecciona</option>
                                      {catalogWorkers.map(w => (
                                        <option key={w.id || w._id} value={w.id || w._id}>{w.nombre}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td>
                                    <span>{row.rut || ''}</span>
                                  </td>
                                  <td>
                                    <span>{row.nombre || ''}</span>
                                  </td>
                                  <td>
                                    {row.workerId ? (
                                      <span>{row.cargo || ''}</span>
                                    ) : (
                                      <select value={row.cargo || ''} onChange={e => handleTeamChange(idx, 'cargo', e.target.value)} className="input-table">
                                        <option value="">Selecciona</option>
                                        {uniqueCargos.map(cargo => (
                                          <option key={cargo} value={cargo}>{cargo}</option>
                                        ))}
                                        <option value="__custom">Otro...</option>
                                      </select>
                                    )}
                                    {row.cargo === '__custom' && (
                                      <input type="text" className="input-table" placeholder="Escribe el cargo" onBlur={e => handleTeamChange(idx, 'cargo', e.target.value)} autoFocus />
                                    )}
                                  </td>
                                  <td>
                                    <select value={row.tramoId || ''} onChange={e => handleTeamChange(idx, 'tramoId', e.target.value)} className="input-table">
                                      <option value="">Selecciona</option>
                                      {catalogTramos.map(t => (
                                        <option key={t.id || t._id} value={t.id || t._id}>{t.nombre}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td>
                                    <select value={row.activityId || ''} onChange={e => handleTeamChange(idx, 'activityId', e.target.value)} className="input-table">
                                      <option value="">Selecciona</option>
                                      {catalogActivities.map(a => (
                                        <option key={a._id || a.id} value={a._id || a.id}>{a.nombre}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td>
                                    <input 
                                      type="text" 
                                      value={row.duracion || ''} 
                                      onChange={e => handleTeamChange(idx, 'duracion', e.target.value)} 
                                      className="input-table" 
                                      placeholder="ej: 8h, 4.5h, 480min"
                                    />
                                  </td>
                                  <td>
                                    <select value={row.tipoAsist || ''} onChange={e => handleTeamChange(idx, 'tipoAsist', e.target.value)} className="input-table">
                                      <option value="">Selecciona</option>
                                      {tipoAsistenciaOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                      ))}
                                    </select>
                                  </td>
                                </tr>
                                {team.length > 1 && (
                                  <tr>
                                    <td colSpan="8" style={{ textAlign: 'right', padding: '4px 8px', background: theme === 'dark' ? '#1a1f28' : '#f9f9f9', borderTop: 'none' }}>
                                      <button 
                                        type="button" 
                                        onClick={() => handleRemoveTeamRow(idx)} 
                                        className="btn-remove-row"
                                        title="Eliminar esta fila"
                                      >
                                        ✖ Eliminar Fila {idx + 1}
                                      </button>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="table-btn-row">
                        <button type="button" onClick={handleAddTeamRow} className="btn-primary">Agregar Fila</button>
                      </div>
                    </div>
                    
                    {/* Glosario de tipos de asistencia */}
                    <div className="form-section">
                      <h3>Glosario de Tipos de Asistencia</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '8px', fontSize: '14px', padding: '10px', background: theme === 'dark' ? '#273043' : '#f8f9fa', borderRadius: '5px' }}>
                        {tipoAsistenciaOptions.map(opt => (
                          <div key={opt.value} style={{ padding: '4px' }}>
                            <strong>{opt.value}:</strong> {opt.definition}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="form-section">
                      <h3>Avances</h3>
                      <textarea
                        value={avances}
                        onChange={e => setAvances(e.target.value)}
                        className="input"
                        placeholder="Describe los avances realizados..."
                        rows="4"
                        style={{ resize: 'vertical', minHeight: '100px' }}
                      />
                    </div>

                    <div className="form-section">
                      <h3>Interferencias Responsabilidad Acciona</h3>
                      <textarea
                        value={interferencias}
                        onChange={e => setInterferencias(e.target.value)}
                        className="input"
                        placeholder="Describe las interferencias..."
                        rows="4"
                        style={{ resize: 'vertical', minHeight: '100px' }}
                      />
                    </div>

                    <div className="form-section">
                      <h3>Detenciones Responsabilidad Subcontrato</h3>
                      <textarea
                        value={detenciones}
                        onChange={e => setDetenciones(e.target.value)}
                        className="input"
                        placeholder="Describe las detenciones..."
                        rows="4"
                        style={{ resize: 'vertical', minHeight: '100px' }}
                      />
                    </div>

                    <div className="form-section">
                      <h3>Comentarios</h3>
                      <textarea
                        value={comentarios}
                        onChange={e => setComentarios(e.target.value)}
                        className="input"
                        placeholder="Comentarios adicionales..."
                        rows="4"
                        style={{ resize: 'vertical', minHeight: '100px' }}
                      />
                    </div>

                    <button type="submit" className="btn-success">Enviar Informe</button>
                  </form>
                  <h2>{role === 'admin' ? 'Todos los Informes' : 'Mis Informes'}</h2>
                  {role === 'admin' && reports.length > 0 && (
                    <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
                      <button className="btn-primary" onClick={exportToExcel} style={{minWidth:160}}>
                        Exportar a Excel
                      </button>
                    </div>
                  )}
                  {reports.length === 0 ? (
                    <p>No hay informes para mostrar.</p>
                  ) : (
                    <ul style={{ padding: 0, margin: 0 }}>
                      {reports.map((report) => (
                        <li key={report._id || report.id} style={{
                          background: theme === 'dark' ? '#232a36' : '#fff',
                          borderRadius: 16,
                          boxShadow: '0 2px 12px 0 rgba(44,62,80,0.10)',
                          marginBottom: 32,
                          padding: '32px 24px',
                          border: theme === 'dark' ? '1.5px solid #3d4b5c' : '1.5px solid #e0e6ef',
                          maxWidth: 900,
                          marginLeft: 'auto',
                          marginRight: 'auto',
                        }}>
                          <div style={{ marginBottom: 18 }}>
                            <span style={{ fontWeight: 700, color: theme === 'dark' ? '#7ed6df' : '#2c3e50', fontSize: 18 }}>Usuario:</span> <span style={{ fontWeight: 400 }}>{report.username}</span><br />
                            <span style={{ fontWeight: 700, color: theme === 'dark' ? '#7ed6df' : '#2c3e50', fontSize: 18 }}>Obra:</span> <span style={{ fontWeight: 400 }}>{report.area}</span><br />
                            <span style={{ fontWeight: 700, color: theme === 'dark' ? '#7ed6df' : '#2c3e50', fontSize: 18 }}>Jornada:</span> <span style={{ fontWeight: 400 }}>{report.jornada}</span><br />
                            <span style={{ fontWeight: 700, color: theme === 'dark' ? '#7ed6df' : '#2c3e50', fontSize: 18 }}>Supervisor:</span> <span style={{ fontWeight: 400 }}>{report.supervisor}</span>
                          </div>
                          <div style={{ fontWeight: 700, color: theme === 'dark' ? '#7ed6df' : '#2c3e50', fontSize: 17, marginBottom: 8 }}>Equipo:</div>
                          <div className="table-responsive" style={{ marginBottom: 18 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', background: theme === 'dark' ? '#232a36' : '#fafdff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 6px 0 rgba(44,62,80,0.07)' }}>
                              <thead>
                                <tr style={{ background: theme === 'dark' ? '#273043' : '#f0f6fa' }}>
                                  <th style={{ padding: '12px 8px', fontWeight: 700, fontSize: 15, color: theme === 'dark' ? '#7ed6df' : '#2c3e50', border: '1px solid #bbb' }}>RUT</th>
                                  <th style={{ padding: '12px 8px', fontWeight: 700, fontSize: 15, color: theme === 'dark' ? '#7ed6df' : '#2c3e50', border: '1px solid #bbb' }}>NOMBRE</th>
                                  <th style={{ padding: '12px 8px', fontWeight: 700, fontSize: 15, color: theme === 'dark' ? '#7ed6df' : '#2c3e50', border: '1px solid #bbb' }}>CARGO</th>
                                  <th style={{ padding: '12px 8px', fontWeight: 700, fontSize: 15, color: theme === 'dark' ? '#7ed6df' : '#2c3e50', border: '1px solid #bbb' }}>CÓDIGO EQUIPO</th>
                                  <th style={{ padding: '12px 8px', fontWeight: 700, fontSize: 15, color: theme === 'dark' ? '#7ed6df' : '#2c3e50', border: '1px solid #bbb' }}>TIPO DE ASIST</th>
                                  <th style={{ padding: '12px 8px', fontWeight: 700, fontSize: 15, color: theme === 'dark' ? '#7ed6df' : '#2c3e50', border: '1px solid #bbb' }}>TRAMO</th>
                                  <th style={{ padding: '12px 8px', fontWeight: 700, fontSize: 15, color: theme === 'dark' ? '#7ed6df' : '#2c3e50', border: '1px solid #bbb' }}>ACTIVIDAD</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(report.team || []).map((row, idx) => (
                                  <tr key={idx} style={{ background: idx % 2 === 0 ? (theme === 'dark' ? '#232a36' : '#f7fbfd') : (theme === 'dark' ? '#273043' : '#fff') }}>
                                    <td style={{ border: '1px solid #bbb', padding: '10px 6px' }}>{row.rut}</td>
                                    <td style={{ border: '1px solid #bbb', padding: '10px 6px' }}>{row.nombre}</td>
                                    <td style={{ border: '1px solid #bbb', padding: '10px 6px' }}>{row.cargo}</td>
                                    <td style={{ border: '1px solid #bbb', padding: '10px 6px' }}>{row.codigoEquipo}</td>
                                    <td style={{ border: '1px solid #bbb', padding: '10px 6px' }}>{row.tipoAsist}</td>
                                    <td style={{ border: '1px solid #bbb', padding: '10px 6px' }}>{row.tramo || (catalogTramos.find(t => t.id === row.tramoId || t._id === row.tramoId)?.nombre || '')}</td>
                                    <td style={{ border: '1px solid #bbb', padding: '10px 6px' }}>{row.actividad || (catalogActivities.find(a => a.id === row.activityId || a._id === row.activityId)?.nombre || '')}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {report.avances && report.avances.length > 0 && (
                            <div style={{ marginBottom: 10 }}>
                              <span style={{ fontWeight: 700, color: '#0984e3' }}>Avances Realizados:</span>
                              <ul style={{ margin: '8px 0 0 0', padding: 0, listStyle: 'disc inside' }}>
                                {report.avances.map((avance, idx) => (
                                  <li key={idx} style={{ color: theme === 'dark' ? '#e0e6ef' : '#222', fontSize: 15 }}>{avance.descripcion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {report.interferencias && report.interferencias.length > 0 && (
                            <div style={{ marginBottom: 10 }}>
                              <span style={{ fontWeight: 700, color: '#d35400' }}>Interferencias Responsabilidad Acción:</span>
                              <ul style={{ margin: '8px 0 0 0', padding: 0, listStyle: 'disc inside' }}>
                                {report.interferencias.map((interferencia, idx) => (
                                  <li key={idx} style={{ color: theme === 'dark' ? '#e0e6ef' : '#222', fontSize: 15 }}>{interferencia.descripcion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {report.detenciones && report.detenciones.length > 0 && (
                            <div style={{ marginBottom: 10 }}>
                              <span style={{ fontWeight: 700, color: '#c0392b' }}>Detenciones por Responsabilidad Subcontrato:</span>
                              <ul style={{ margin: '8px 0 0 0', padding: 0, listStyle: 'disc inside' }}>
                                {report.detenciones.map((detencion, idx) => (
                                  <li key={idx} style={{ color: theme === 'dark' ? '#e0e6ef' : '#222', fontSize: 15 }}>{detencion.descripcion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {report.comentarios && report.comentarios.length > 0 && (
                            <div style={{ marginBottom: 10 }}>
                              <span style={{ fontWeight: 700, color: '#27ae60' }}>Comentarios:</span>
                              <ul style={{ margin: '8px 0 0 0', padding: 0, listStyle: 'disc inside' }}>
                                {report.comentarios.map((comentario, idx) => (
                                  <li key={idx} style={{ color: theme === 'dark' ? '#e0e6ef' : '#222', fontSize: 15 }}>{comentario.descripcion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
                            <small style={{ color: theme === 'dark' ? '#7ed6df' : '#7f8c8d', fontSize: 14 }}>Enviado el: {new Date(report.dateSubmitted).toLocaleString()}</small>
                            <button
                              type="button"
                              onClick={() => { setShowDeleteModal(true); setReportToDelete(report._id || report.id); }}
                              className="btn-danger btn-delete-report"
                              title="Eliminar informe"
                              style={{ minWidth: 120, fontSize: 16, borderRadius: 6, marginLeft: 16 }}
                            >
                              Eliminar
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* Modal de confirmación de borrado */}
                  {showDeleteModal && (
                    <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.4)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <div style={{background:'#fff',padding:32,borderRadius:12,minWidth:300,boxShadow:'0 2px 16px 0 rgba(44,62,80,0.18)',textAlign:'center'}}>
                        <h3>¿Estás seguro de que deseas eliminar este informe?</h3>
                        <div style={{marginTop:24,display:'flex',gap:16,justifyContent:'center'}}>
                          <button className="btn-danger" onClick={handleDeleteReport}>Eliminar</button>
                          <button className="btn-primary" onClick={()=>{setShowDeleteModal(false);setReportToDelete(null);}}>Cancelar</button>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* MODALS PANEL ADMIN */}
                  {adminModal === 'actividad' && showManageModal && (
                    <div className="modal-bg">
                      <div className="modal-box">
                        <button className="modal-close" onClick={() => { setShowManageModal(false); setModalError(''); }}>×</button>
                        <h2>Agregar Actividad</h2>
                        <form onSubmit={async e => {
                          e.preventDefault();
                          setModalLoading(true); setModalError('');
                          const nombre = e.target.nombre.value.trim();
                          if (!nombre) { setModalError('Debes ingresar un nombre.'); setModalLoading(false); return; }
                          try {
                            const res = await axios.post(`${API_URL}/catalog/activities`, { nombre }, { headers: { Authorization: `Bearer ${token}` } });
                            setCatalogActivities(prev => [...prev, res.data]);
                            setShowManageModal(false);
                          } catch (err) { setModalError('Error: ' + (err.response?.data?.message || err.message)); }
                          setModalLoading(false);
                        }}>
                          <input name="nombre" type="text" className="input" placeholder="Nombre de la actividad" autoFocus />
                          {modalError && <div className="error-box">{modalError}</div>}
                          <button type="submit" className="btn-success" disabled={modalLoading}>{modalLoading ? 'Agregando...' : 'Confirmar'}</button>
                        </form>
                      </div>
                    </div>
                  )}
                  {adminModal === 'tramo' && showManageModal && (
                    <div className="modal-bg">
                      <div className="modal-box">
                        <button className="modal-close" onClick={() => { setShowManageModal(false); setModalError(''); }}>×</button>
                        <h2>Agregar Tramo</h2>
                        <form onSubmit={async e => {
                          e.preventDefault();
                          setModalLoading(true); setModalError('');
                          const nombre = e.target.nombre.value.trim();
                          if (!nombre) { setModalError('Debes ingresar un nombre.'); setModalLoading(false); return; }
                          try {
                            const res = await axios.post(`${API_URL}/catalog/tramos`, { nombre }, { headers: { Authorization: `Bearer ${token}` } });
                            setCatalogTramos(prev => [...prev, res.data]);
                            setShowManageModal(false);
                          } catch (err) { setModalError('Error: ' + (err.response?.data?.message || err.message)); }
                          setModalLoading(false);
                        }}>
                          <input name="nombre" type="text" className="input" placeholder="Nombre del tramo" autoFocus />
                          {modalError && <div className="error-box">{modalError}</div>}
                          <button type="submit" className="btn-success" disabled={modalLoading}>{modalLoading ? 'Agregando...' : 'Confirmar'}</button>
                        </form>
                      </div>
                    </div>
                  )}
                  {adminModal === 'trabajador' && showManageModal && (
                    <div className="modal-bg">
                      <div className="modal-box">
                        <button className="modal-close" onClick={() => { setShowManageModal(false); setModalError(''); }}>×</button>
                        <h2>Agregar Trabajador</h2>
                        <form onSubmit={async e => {
                          e.preventDefault();
                          setModalLoading(true); setModalError('');
                          const apellidos = e.target.apellidos.value.trim();
                          const nombres = e.target.nombres.value.trim();
                          const rut = e.target.rut.value.trim();
                          const cargo = e.target.cargo.value.trim();
                          // Validación de RUT: solo formato 12345678-9
                          const rutRegex = /^\d{7,8}-[\dkK]$/;
                          if (!apellidos || !nombres || !rut || !cargo) { setModalError('Completa todos los campos.'); setModalLoading(false); return; }
                          if (!rutRegex.test(rut)) {
                            setModalError('El RUT debe estar en formato 12345678-9, sin puntos.');
                            setModalLoading(false);
                            return;
                          }
                          if (rut.includes('.')) {
                            setModalError('No se aceptan puntos en el RUT.');
                            setModalLoading(false);
                            return;
                          }
                          // Unir apellidos y nombres, todo en mayúsculas
                          const nombre = `${apellidos} ${nombres}`.toUpperCase();
                          try {
                            const res = await axios.post(`${API_URL}/catalog/workers`, { nombre, rut, cargo }, { headers: { Authorization: `Bearer ${token}` } });
                            setCatalogWorkers(prev => [...prev, res.data]);
                            setShowManageModal(false);
                          } catch (err) { setModalError('Error: ' + (err.response?.data?.message || err.message)); }
                          setModalLoading(false);
                        }}>
                          <input name="apellidos" type="text" className="input" placeholder="Apellidos" autoFocus />
                          <input name="nombres" type="text" className="input" placeholder="Nombres" />
                          <input name="rut" type="text" className="input" placeholder="RUT (12345678-9)" />
                          <select name="cargo" className="input">
                            <option value="">Selecciona Cargo</option>
                            {catalogCargos.map(cargo => (
                              <option key={cargo} value={cargo}>{cargo}</option>
                            ))}
                          </select>
                          {modalError && <div className="error-box">{modalError}</div>}
                          <button type="submit" className="btn-success" disabled={modalLoading}>{modalLoading ? 'Agregando...' : 'Confirmar'}</button>
                        </form>
                      </div>
                    </div>
                  )}
                  {adminModal === 'supervisor' && showManageModal && (
                    <div className="modal-bg">
                      <div className="modal-box">
                        <button className="modal-close" onClick={() => { setShowManageModal(false); setModalError(''); }}>×</button>
                        <h2>Agregar Supervisor</h2>
                        <form onSubmit={async e => {
                          e.preventDefault();
                          setModalLoading(true); setModalError('');
                          const apellidos = e.target.apellidos.value.trim();
                          const nombres = e.target.nombres.value.trim();
                          const rut = e.target.rut.value.trim();
                          // Validación de RUT: solo formato 12345678-9
                          const rutRegex = /^\d{7,8}-[\dkK]$/;
                          if (!apellidos || !nombres || !rut) { setModalError('Completa todos los campos.'); setModalLoading(false); return; }
                          if (!rutRegex.test(rut)) {
                            setModalError('El RUT debe estar en formato 12345678-9, sin puntos.');
                            setModalLoading(false);
                            return;
                          }
                          if (rut.includes('.')) {
                            setModalError('No se aceptan puntos en el RUT.');
                            setModalLoading(false);
                            return;
                          }
                          // Unir apellidos y nombres, todo en mayúsculas
                          const nombre = `${apellidos} ${nombres}`.toUpperCase();
                          try {
                            const res = await axios.post(`${API_URL}/catalog/supervisors`, { nombre, rut }, { headers: { Authorization: `Bearer ${token}` } });
                            setCatalogSupervisors(prev => [...prev, res.data]);
                            setShowManageModal(false);
                          } catch (err) { setModalError('Error: ' + (err.response?.data?.message || err.message)); }
                          setModalLoading(false);
                        }}>
                          <input name="apellidos" type="text" className="input" placeholder="Apellidos" autoFocus />
                          <input name="nombres" type="text" className="input" placeholder="Nombres" />
                          <input name="rut" type="text" className="input" placeholder="RUT (12345678-9)" />
                          {modalError && <div className="error-box">{modalError}</div>}
                          <button type="submit" className="btn-success" disabled={modalLoading}>{modalLoading ? 'Agregando...' : 'Confirmar'}</button>
                        </form>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
};

export default App;