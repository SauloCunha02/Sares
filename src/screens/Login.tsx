/* SARES — Tela de entrada. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useData } from '../lib/DataContext';
import { PERFIS } from '../lib/permissions';
import { U } from '../lib/utils';
import { ok as toastOk } from '../lib/toast';

export default function Login() {
  const { entrarPorCredenciais } = useAuth();
  const { siglaServico } = useData();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEntrando(true);
    try {
      const u = await entrarPorCredenciais(email, senha);
      if (!u) { setErro('Credenciais inválidas'); return; }
      toastOk('Bem-vindo(a), ' + U.primeiroNome(u.nome),
        PERFIS[u.perfil].rotulo + (u.servicoId ? ' · ' + siglaServico(u.servicoId) : ''));
      navigate('/inicio');
    } catch {
      setErro('Credenciais inválidas');
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div className="login-page">
      <aside className="login-aside">
        <div className="la-brand">
          <img className="brand-mark" src="/SARES.png" alt="" aria-hidden="true" />
          <span className="brand-text"><span className="bt-name">SARES</span><span className="bt-sub">Rede de cuidado TEA</span></span>
        </div>
        <div className="la-pitch">
          <h2>A rede de cuidado à pessoa com TEA, em um só lugar.</h2>
          <p>Cinco serviços, um único histórico. O SARES substitui os cadernos de papel
            por uma linha do tempo compartilhada entre saúde, educação e assistência social
            do município de Crateús.</p>
          <div className="la-frentes">
            <div className="la-frente"><span className="lf-n">1</span> Filas de atendimento informatizadas e priorizáveis</div>
            <div className="la-frente"><span className="lf-n">2</span> Detecção automática de duplicidade</div>
            <div className="la-frente"><span className="lf-n">3</span> Histórico contínuo com presença e falta</div>
            <div className="la-frente"><span className="lf-n">4</span> Integração entre NASF, NAPE, CREAES, Casa Mais Azul e CRASF</div>
          </div>
        </div>
      </aside>

      <main className="login-main">
        <div className="login-card">
          <h1>Entrar no sistema</h1>
          <p>Use suas credenciais da rede municipal.</p>

          <form onSubmit={onSubmit} noValidate>
            <div className="u-col u-gap-4">
              <div className="field">
                <label htmlFor="login-email">E-mail institucional<span className="req" aria-hidden="true">*</span></label>
                <input className="input" id="login-email" name="email" type="email" required
                  placeholder="nome.sobrenome@crateus.ce.gov.br" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="login-senha">Senha<span className="req" aria-hidden="true">*</span></label>
                <input className="input" id="login-senha" name="senha" type="password" required placeholder="••••••••"
                  value={senha} onChange={(e) => setSenha(e.target.value)} />
              </div>
              {erro ? (
                <div className="alert alert-bad">
                  <div className="a-title">Credenciais inválidas</div>
                  <div>Confira o e-mail e a senha, ou procure a coordenação do seu serviço.</div>
                </div>
              ) : null}
              <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={entrando}>Entrar</button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
