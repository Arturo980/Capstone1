import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = ({ theme }) => {
  const navigate = useNavigate();
  // Cambia el theme del dashboard de MongoDB Charts según el modo
  const chartsTheme = theme === 'dark' ? 'dark' : 'light';
  return (
    <div style={{ width: '100%', minHeight: '80vh', padding: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Dashboard de Reportes</h2>
      </div>
      <iframe
        style={{ width: '100%', height: '80vh', minHeight: 500, background: theme === 'dark' ? '#232a36' : '#F1F5F4', border: 'none', borderRadius: 2, boxShadow: '0 2px 10px 0 rgba(70, 76, 79, .2)' }}
        src={`https://charts.mongodb.com/charts-project-0-gvtlivt/embed/dashboards?id=683f2c30-350d-40e9-8ede-296ec3f5bd72&theme=${chartsTheme}&autoRefresh=true&maxDataAge=14400&showTitleAndDesc=true&scalingWidth=scale&scalingHeight=scale`}
        title="Dashboard MongoDB Charts"
        allowFullScreen
      />
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
