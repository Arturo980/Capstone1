import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Dashboard from './Dashboard';
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';

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
  horaInicio: '',
  horaFin: ''
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
  const [theme, setTheme] = useState('light');
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

  // NUEVO: Hooks para cargar catálogos
  const [catalogActivities, setCatalogActivities] = useState([]);
  const [catalogTramos, setCatalogTramos] = useState([]);
  const [catalogWorkers, setCatalogWorkers] = useState([]);

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

  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
  }, [theme]);

  // NUEVO: Cargar catálogos al iniciar sesión
  useEffect(() => {
    if (!token) return;
    axios.get(`${API_URL}/catalog/activities`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setCatalogActivities(res.data)).catch(() => {});
    axios.get(`${API_URL}/catalog/tramos`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setCatalogTramos(res.data)).catch(() => {});
    axios.get(`${API_URL}/catalog/workers`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setCatalogWorkers(res.data)).catch(() => {});
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

  useEffect(() => {
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
      alert('Debes completar área, jornada y supervisor.');
      return;
    }
    if (team.length === 0 || team.every(row => Object.values(row).every(val => !val))) {
      alert('Debes ingresar al menos un integrante del equipo.');
      return;
    }
    
    // Filtrar filas vacías
    const filteredTeam = team.filter(row => Object.values(row).some(val => val));
    
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

  // Eliminar informe
  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este informe?')) return;
    setLoading(true);
    setNetworkError('');
    try {
      // Asegúrate de que el ID es correcto y de tipo número
      const id = typeof reportId === 'number' ? reportId : Number(reportId);
      await axios.delete(`${API_URL}/reports/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refrescar la lista después de borrar
      if (role === 'admin') {
        await fetchAllReports(token);
      } else {
        await fetchReports(token);
      }
    } catch (error) {
      // Mostrar el mensaje de error del backend si existe
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

  // NUEVO: Cálculo de horas trabajadas
  function calcularHoras(inicio, fin) {
    if (!inicio || !fin) return '';
    const [h1, m1] = inicio.split(':').map(Number);
    const [h2, m2] = fin.split(':').map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60;
    return `${Math.floor(diff / 60)}:${(diff % 60).toString().padStart(2, '0')}`;
  }

  return (
    <Router>
      <div className={`main-container${theme === 'dark' ? ' dark' : ''}`}>
        <div className="theme-toggle-row">
          <button
            type="button"
            className="btn-theme-toggle"
            onClick={toggleTheme}
          >
            {theme === 'light' ? '🌙 Modo Noche' : '☀️ Modo Día'}
          </button>
          {token && role === 'admin' && (
            <Link to="/dashboard" className="btn-primary" style={{ marginLeft: 10 }}>
              Ver Dashboard
            </Link>
          )}
        </div>
        <Routes>
          <Route path="/dashboard" element={
            token && role === 'admin' ? <Dashboard /> : <div style={{padding:40, textAlign:'center'}}><h2>Acceso denegado</h2><p>Solo los administradores pueden ver el dashboard.</p></div>
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
                  <div className="header-row">
                    <h2>Crear Informe</h2>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {role === 'admin' && (
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => setShowRegister(v => !v)}
                          style={{ minWidth: 120 }}
                        >
                          {showRegister ? 'Cerrar Registro' : 'Registrar Usuario'}
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="btn-danger"
                      >
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                  {role === 'admin' && showRegister && (
                    <form className="register-box" onSubmit={handleRegister}>
                      <h2>Registrar Usuario</h2>
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
                        <div className="col" style={{ display: 'flex', alignItems: 'center' }}>
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
                  )}
                  <form
                    onSubmit={e => { e.preventDefault(); handleReportSubmit(); }}
                    className="form-section"
                  >
                    <h2>Equipo y Avances</h2>
                    <div className="row">
                      <div className="col">
                        <input type="text" className="input" placeholder="Área" value={area} onChange={e => setArea(e.target.value)} />
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
                          {catalogWorkers.filter(w => (w.cargo || '').toLowerCase().includes('supervisor')).map(w => (
                            <option key={w._id || w.id} value={w.nombre}>{w.nombre}</option>
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
                            <th>Hora Inicio</th>
                            <th>Hora Fin</th>
                            <th>Horas Trabajadas</th>
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
                                    <select value={row.cargo || ''} onChange={e => handleTeamChange(idx, 'cargo', e.target.value)} className="input-table">
                                      <option value="">Selecciona</option>
                                      {uniqueCargos.map(cargo => (
                                        <option key={cargo} value={cargo}>{cargo}</option>
                                      ))}
                                      <option value="__custom">Otro...</option>
                                    </select>
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
                                        <option key={a.id} value={a.id}>{a.nombre}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td>
                                    <input type="time" value={row.horaInicio || ''} onChange={e => handleTeamChange(idx, 'horaInicio', e.target.value)} className="input-table" />
                                  </td>
                                  <td>
                                    <input type="time" value={row.horaFin || ''} onChange={e => handleTeamChange(idx, 'horaFin', e.target.value)} className="input-table" />
                                  </td>
                                  <td>{calcularHoras(row.horaInicio, row.horaFin)}</td>
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
                                    <td colSpan="10" style={{ textAlign: 'right', padding: '4px 8px', background: theme === 'dark' ? '#1a1f28' : '#f9f9f9', borderTop: 'none' }}>
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
                      <h3>Interferencias Responsabilidad Acción</h3>
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
                      <h3>Detenciones por Responsabilidad Subcontrato</h3>
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
                  {reports.length === 0 ? (
                    <p>No hay informes para mostrar.</p>
                  ) : (
                    <ul>
                      {reports.map((report) => (
                        <li key={report._id || report.id}>
                          <div style={{ marginBottom: '8px', paddingLeft: '8px', borderLeft: '3px solid #3498db' }}>
                            <div><strong>Área:</strong> {report.area}</div>
                            <div><strong>Jornada:</strong> {report.jornada}</div>
                            <div><strong>Supervisor:</strong> {report.supervisor}</div>
                            <div>
                              <strong>Equipo:</strong>
                              <div className="table-responsive">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>RUT</th>
                                      <th>NOMBRE</th>
                                      <th>CARGO</th>
                                      <th>CÓDIGO EQUIPO</th>
                                      <th>TIPO DE ASIST</th>
                                      <th>TRAMO</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(report.team || []).map((row, idx) => (
                                      <tr key={idx}>
                                        <td>{row.rut}</td>
                                        <td>{row.nombre}</td>
                                        <td>{row.cargo}</td>
                                        <td>{row.codigoEquipo}</td>
                                        <td>{row.tipoAsist}</td>
                                        <td>{
                                          row.tramo ||
                                          (catalogTramos.find(t => t.id === row.tramoId || t._id === row.tramoId)?.nombre || '')
                                        }</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            {report.avances && report.avances.length > 0 && (
                              <div>
                                <strong>Avances Realizados:</strong>
                                <div style={{ marginLeft: '16px', padding: '8px', background: theme === 'dark' ? '#273043' : '#f8f9fa', borderRadius: '4px' }}>
                                  {report.avances.map((avance, idx) => (
                                    <div key={idx}>{avance.descripcion}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {report.interferencias && report.interferencias.length > 0 && (
                              <div>
                                <strong>Interferencias Responsabilidad Acción:</strong>
                                <div style={{ marginLeft: '16px', padding: '8px', background: theme === 'dark' ? '#273043' : '#f9f9fa', borderRadius: '4px' }}>
                                  {report.interferencias.map((interferencia, idx) => (
                                    <div key={idx}>{interferencia.descripcion}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {report.detenciones && report.detenciones.length > 0 && (
                              <div>
                                <strong>Detenciones por Responsabilidad Subcontrato:</strong>
                                <div style={{ marginLeft: '16px', padding: '8px', background: theme === 'dark' ? '#273043' : '#f9f9fa', borderRadius: '4px' }}>
                                  {report.detenciones.map((detencion, idx) => (
                                    <div key={idx}>{detencion.descripcion}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {report.comentarios && report.comentarios.length > 0 && (
                              <div>
                                <strong>Comentarios:</strong>
                                <div style={{ marginLeft: '16px', padding: '8px', background: theme === 'dark' ? '#273043' : '#f9f9fa', borderRadius: '4px' }}>
                                  {report.comentarios.map((comentario, idx) => (
                                    <div key={idx}>{comentario.descripcion}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <small style={{ color: '#7f8c8d' }}>Enviado el: {new Date(report.dateSubmitted).toLocaleString()}</small>
                          <button
                            type="button"
                            onClick={() => handleDeleteReport(report._id || report.id)}
                            className="btn-danger btn-delete-report"
                            title="Eliminar informe"
                          >
                            Eliminar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* Panel de administración (solo admin) */}
                  {role === 'admin' && (
                    <div className="admin-panel" style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                      {/* Agregar Actividad */}
                      <form onSubmit={async e => {
                        e.preventDefault();
                        if (!e.target.nombre.value.trim()) return;
                        try {
                          const res = await axios.post(`${API_URL}/catalog/activities`, { nombre: e.target.nombre.value }, { headers: { Authorization: `Bearer ${token}` } });
                          setCatalogActivities(prev => [...prev, res.data]);
                          e.target.reset();
                        } catch (err) { alert('Error: ' + (err.response?.data?.message || err.message)); }
                      }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input name="nombre" type="text" placeholder="Nueva actividad" className="input" />
                        <button type="submit" className="btn-primary">Agregar Actividad</button>
                      </form>
                      {/* Agregar Tramo */}
                      <form onSubmit={async e => {
                        e.preventDefault();
                        if (!e.target.nombre.value.trim()) return;
                        try {
                          const res = await axios.post(`${API_URL}/catalog/tramos`, { nombre: e.target.nombre.value }, { headers: { Authorization: `Bearer ${token}` } });
                          setCatalogTramos(prev => [...prev, res.data]);
                          e.target.reset();
                        } catch (err) { alert('Error: ' + (err.response?.data?.message || err.message)); }
                      }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input name="nombre" type="text" placeholder="Nuevo tramo" className="input" />
                        <button type="submit" className="btn-primary">Agregar Tramo</button>
                      </form>
                      {/* Agregar Trabajador */}
                      <form onSubmit={async e => {
                        e.preventDefault();
                        const nombre = e.target.nombre.value.trim();
                        const rut = e.target.rut.value.trim();
                        const cargo = e.target.cargo.value.trim();
                        if (!nombre || !rut || !cargo) return;
                        try {
                          const res = await axios.post(`${API_URL}/catalog/workers`, { nombre, rut, cargo }, { headers: { Authorization: `Bearer ${token}` } });
                          setCatalogWorkers(prev => [...prev, res.data]);
                          e.target.reset();
                        } catch (err) { alert('Error: ' + (err.response?.data?.message || err.message)); }
                      }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input name="nombre" type="text" placeholder="Nombre Trabajador" className="input" />
                        <input name="rut" type="text" placeholder="RUT" className="input" />
                        <select name="cargo" className="input">
                          <option value="">Selecciona Cargo</option>
                          {catalogCargos.map(cargo => (
                            <option key={cargo} value={cargo}>{cargo}</option>
                          ))}
                        </select>
                        <button type="submit" className="btn-primary">Agregar Trabajador</button>
                      </form>
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