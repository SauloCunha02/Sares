/* SARES — Rotas. Porte do registro de rotas de js/app.js + js/lib/router.js
   para react-router-dom. A guarda (redireciona para /login se não
   autenticado, ou para /inicio se autenticado e em /login) é o mesmo
   papel que `router.guarda` tinha no original. */
import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell';
import { useAuth } from './lib/AuthContext';
import Login from './screens/Login';
import Inicio from './screens/Inicio';
import Pacientes from './screens/Pacientes';
import PacienteNovo from './screens/PacienteNovo';
import PacienteDetalhe from './screens/PacienteDetalhe';
import Anamnese from './screens/Anamnese';
import Filas from './screens/Filas';
import AtendimentoNovo from './screens/AtendimentoNovo';
import Duplicidades from './screens/Duplicidades';
import Indicadores from './screens/Indicadores';
import Auditoria from './screens/Auditoria';
import Configuracoes from './screens/Configuracoes';

function CarregandoTelaCheia() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <img src="/SARES.png" alt="" width={64} height={64} style={{ borderRadius: 14, marginBottom: 12 }} />
        <p style={{ fontSize: 14, color: 'var(--atlas-muted, #5F6E6D)' }}>Carregando…</p>
      </div>
    </div>
  );
}

function RotaProtegida({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useAuth();
  if (carregando) return <CarregandoTelaCheia />;
  if (!usuario) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RotaLogin() {
  const { usuario, carregando } = useAuth();
  if (carregando) return <CarregandoTelaCheia />;
  if (usuario) return <Navigate to="/inicio" replace />;
  return <Login />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<RotaLogin />} />
      <Route path="/" element={<RotaProtegida><Shell /></RotaProtegida>}>
        <Route index element={<Navigate to="/inicio" replace />} />
        <Route path="inicio" element={<Inicio />} />
        <Route path="pacientes" element={<Pacientes />} />
        <Route path="paciente/novo" element={<PacienteNovo />} />
        <Route path="paciente/:id" element={<PacienteDetalhe />} />
        <Route path="anamnese/:id" element={<Anamnese />} />
        <Route path="filas" element={<Filas />} />
        <Route path="atendimento/novo" element={<AtendimentoNovo />} />
        <Route path="duplicidades" element={<Duplicidades />} />
        <Route path="indicadores" element={<Indicadores />} />
        <Route path="auditoria" element={<Auditoria />} />
        <Route path="configuracoes" element={<Configuracoes />} />
      </Route>
      <Route path="*" element={<Navigate to="/inicio" replace />} />
    </Routes>
  );
}
