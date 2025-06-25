import React from 'react';

const Dashboard = ({ theme }) => {
  const chartsTheme = theme === 'dark' ? 'dark' : 'light';
  const iframeBg = theme === 'dark' ? '#21313C' : '#FFFFFF';

  // Estilos responsivos para el contenedor y los iframes
  const containerStyle = {
    display: 'flex',
    gap: 24,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  };
  const iframeWrapperStyle = {
    flex: '1 1 48%',
    maxWidth: '48%',
    width: '100%',
    position: 'relative',
    paddingBottom: '75%', // 4:3 aspect ratio
    height: 0,
    marginBottom: 0,
  };
  const iframeStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: iframeBg,
    border: 'none',
    borderRadius: 2,
    boxShadow: '0 2px 10px 0 rgba(70, 76, 79, .2)'
  };

  // Media query para móvil
  const mediaQuery = `@media (max-width: 900px) {\n  .dashboard-flex { flex-direction: column !important; }\n  .dashboard-iframe { max-width: 100% !important; width: 100% !important; padding-bottom: 75% !important; margin-bottom: 24px !important; }\n}`;

  return (
    <div style={{ width: '100%', minHeight: '80vh', padding: 0 }}>
      <style>{mediaQuery}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Dashboard de Reportes</h2>
      </div>
      <div className="dashboard-flex" style={containerStyle}>
        {/* Primer iframe */}
        <div className="dashboard-iframe" style={iframeWrapperStyle}>
          <iframe
            style={iframeStyle}
            src={`https://charts.mongodb.com/charts-project-0-gvtlivt/embed/charts?id=c10172c4-989d-457e-8dad-9cbb8f9ee3fe&maxDataAge=14400&theme=${chartsTheme}&autoRefresh=true`}
            title="Reporte 1"
            allowFullScreen
          />
        </div>
        {/* Segundo iframe */}
        <div className="dashboard-iframe" style={iframeWrapperStyle}>
          <iframe
            style={iframeStyle}
            src={`https://charts.mongodb.com/charts-project-0-gvtlivt/embed/charts?id=f4014cdc-d23d-4bf6-a46d-985a75f29aec&maxDataAge=14400&theme=${chartsTheme}&autoRefresh=true`}
            title="Reporte 2"
            allowFullScreen
          />
        </div>
        {/* Tercer iframe aquí */}
        <div className="dashboard-iframe" style={iframeWrapperStyle}>
          {/* Agrega aquí el src del tercer informe cuando lo tengas */}
        </div>
      </div>
      <button
        style={{ marginTop: 24, padding: '10px 24px', fontSize: 16, borderRadius: 4, border: 'none', background: '#4F8A8B', color: '#fff', cursor: 'pointer' }}
        onClick={() => window.location.href = '/'}
      >
        Volver
      </button>
    </div>
  );
};

export default Dashboard;
