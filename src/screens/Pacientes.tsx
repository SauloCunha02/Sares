/* SARES — Lista de pacientes. Porte de js/screens/pacientes.js. */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Vazio, LinhaPaciente, CartaoPaciente, SeletorSimples } from '../components/ui';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/AuthContext';
import { useData } from '../lib/DataContext';
import { useTopbar } from '../lib/TopbarContext';
import { pode } from '../lib/permissions';
import { U } from '../lib/utils';
import { log as auditLog } from '../lib/audit';
import { ok as toastOk } from '../lib/toast';
import type { Paciente } from '../lib/types';

interface EstadoFiltro {
  termo: string; servico: string; prioridade: string; faixa: string; nivel: string; zona: string;
  ordem: 'nome' | 'idade' | 'cns' | 'ultima'; desc: boolean;
}

const ESTADO_INICIAL: EstadoFiltro = { termo: '', servico: '', prioridade: '', faixa: '', nivel: '', zona: '', ordem: 'nome', desc: false };

export default function Pacientes() {
  const { usuario } = useAuth();
  const data = useData();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [estado, setEstado] = useState<EstadoFiltro>(ESTADO_INICIAL);
  const [amplo, setAmplo] = useState(typeof window !== 'undefined' ? window.innerWidth >= 900 : true);

  useEffect(() => {
    const busca = params.get('busca');
    if (busca) setEstado((s) => ({ ...s, termo: busca }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function aoRedimensionar() { setAmplo(window.innerWidth >= 900); }
    window.addEventListener('resize', aoRedimensionar);
    return () => window.removeEventListener('resize', aoRedimensionar);
  }, []);

  useTopbar('Pacientes', data.pacientes.length + ' cadastros ativos na rede municipal');

  const lista = useMemo(() => {
    const termo = U.normalizar(estado.termo);
    const digitos = estado.termo.replace(/\D/g, '');

    let filtrados = data.pacientes.filter((p) => {
      if (termo.length >= 2) {
        const casa = U.normalizar(p.nomeCompleto).indexOf(termo) >= 0 ||
          U.normalizar(p.nomeMae).indexOf(termo) >= 0 ||
          p.dataNascimento === estado.termo ||
          U.fmtData(p.dataNascimento) === estado.termo ||
          (digitos.length >= 3 && (String(p.cns).indexOf(digitos) >= 0 || String(p.cpf).indexOf(digitos) >= 0));
        if (!casa) return false;
      }
      if (estado.servico && data.servicosDoPaciente(p.id).indexOf(estado.servico) < 0) return false;
      if (estado.prioridade) {
        const temPrio = data.filasDoPaciente(p.id).some((f) => f.prioridade === estado.prioridade);
        if (!temPrio) return false;
      }
      if (estado.faixa) {
        const [min, max] = estado.faixa.split('-').map(Number);
        const idade = U.idade(p.dataNascimento);
        if (idade < min || idade > max) return false;
      }
      if (estado.nivel && p.nivelSuporte !== estado.nivel) return false;
      if (estado.zona && p.endereco.zona !== estado.zona) return false;
      return true;
    });

    const chaves: Record<string, (p: Paciente) => string | number> = {
      nome: (p) => U.normalizar(p.nomeCompleto),
      idade: (p) => U.idade(p.dataNascimento),
      cns: (p) => p.cns || 'zzz',
      ultima: (p) => data.ultimaVisita(p.id) || '0000-00-00'
    };

    filtrados = U.ordenarPor(filtrados, chaves[estado.ordem] || chaves.nome, estado.desc);
    return filtrados;
  }, [data, estado]);

  function trocarOrdem(campo: EstadoFiltro['ordem']) {
    setEstado((s) => ({ ...s, ordem: campo, desc: s.ordem === campo ? !s.desc : false }));
  }

  function limpar() { setEstado(ESTADO_INICIAL); }

  async function exportar() {
    await auditLog(usuario, 'exportou_dados', 'paciente', null, null, 'Exportação de ' + lista.length + ' pacientes em CSV');
    U.baixarCSV('sares-pacientes-' + U.hojeISO() + '.csv',
      ['Nome', 'Data de nascimento', 'Idade', 'CNS', 'Nome da mãe', 'Bairro', 'Zona', 'Hipótese diagnóstica', 'Nível de suporte', 'Serviços', 'Última visita'],
      lista.map((p) => [
        p.nomeCompleto, U.fmtData(p.dataNascimento), U.idade(p.dataNascimento),
        U.fmtCNS(p.cns), p.nomeMae, p.endereco.bairro, p.endereco.zona,
        p.hipoteseDiagnostica, p.nivelSuporte,
        data.servicosDoPaciente(p.id).map(data.siglaServico).join(' / '),
        data.ultimaVisita(p.id) ? U.fmtData(data.ultimaVisita(p.id)!) : ''
      ]));
    toastOk('Exportação concluída', lista.length + ' registros. A ação ficou registrada na auditoria.');
  }

  function servicosDe(p: Paciente) {
    return data.servicosDoPaciente(p.id).map((id) => {
      const s = data.servico(id)!;
      return { id, sigla: s.sigla, cor: s.cor, nome: s.nome };
    });
  }

  function ind(campo: EstadoFiltro['ordem']) {
    return estado.ordem === campo ? <span className="sort-ind">{estado.desc ? '▼' : '▲'}</span> : null;
  }

  return (
    <div className="view-wide">
      <div className="page-head">
        <div className="ph-title">
          <h1>Pacientes</h1>
          <p>Cadastro único da rede — os mesmos dados para saúde, educação e assistência social.</p>
        </div>
        <div className="ph-actions">
          {pode(usuario, 'cadastrar_paciente') ? (
            <button className="btn btn-primary" onClick={() => navigate('/paciente/novo')}><Icon nome="mais" tamanho={17} /> Novo cadastro</button>
          ) : null}
          <button className="btn btn-secondary" onClick={exportar}><Icon nome="baixar" tamanho={17} /> Exportar CSV</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="searchbox u-grow" style={{ maxWidth: 420 }}>
          <Icon nome="busca" tamanho={17} />
          <input className="input" type="search" placeholder="Nome, CNS, CPF, data de nascimento ou nome da mãe"
            aria-label="Buscar pacientes" value={estado.termo} onChange={(e) => setEstado((s) => ({ ...s, termo: e.target.value }))} />
        </div>
        <SeletorSimples rotuloVazio="Todos os serviços" valor={estado.servico}
          opcoes={data.servicos.map((s) => ({ valor: s.id, rotulo: s.sigla }))}
          onChange={(v) => setEstado((s) => ({ ...s, servico: v }))} />
        <SeletorSimples rotuloVazio="Todas as prioridades" valor={estado.prioridade}
          opcoes={['URGENTE', 'CURTO PRAZO', 'LISTA DE ESPERA']}
          onChange={(v) => setEstado((s) => ({ ...s, prioridade: v }))} />
        <SeletorSimples rotuloVazio="Todas as idades" valor={estado.faixa}
          opcoes={[
            { valor: '0-5', rotulo: '0 a 5 anos' }, { valor: '6-11', rotulo: '6 a 11 anos' },
            { valor: '12-17', rotulo: '12 a 17 anos' }, { valor: '18-99', rotulo: '18 anos ou mais' }
          ]}
          onChange={(v) => setEstado((s) => ({ ...s, faixa: v }))} />
        <SeletorSimples rotuloVazio="Todos os níveis" valor={estado.nivel}
          opcoes={['Nível 1', 'Nível 2', 'Nível 3', 'Em investigação']}
          onChange={(v) => setEstado((s) => ({ ...s, nivel: v }))} />
        <SeletorSimples rotuloVazio="Urbana e rural" valor={estado.zona}
          opcoes={['Urbana', 'Rural']}
          onChange={(v) => setEstado((s) => ({ ...s, zona: v }))} />
        <button className="btn btn-ghost btn-sm" onClick={limpar}>Limpar filtros</button>
      </div>

      <div className="card">
        {!lista.length ? (
          <Vazio icone="busca" titulo="Nenhum paciente encontrado"
            texto="Ajuste os filtros ou a busca. Se a pessoa não está cadastrada, crie um novo cadastro."
            acao={pode(usuario, 'cadastrar_paciente') ? <a className="btn btn-primary" href="#/paciente/novo" onClick={(e) => { e.preventDefault(); navigate('/paciente/novo'); }}>Novo cadastro</a> : null} />
        ) : (
          <>
            {amplo ? (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr>
                    <th className="sortable" onClick={() => trocarOrdem('nome')} style={{ cursor: 'pointer' }}>Paciente{ind('nome')}</th>
                    <th className="sortable" onClick={() => trocarOrdem('idade')} style={{ cursor: 'pointer' }}>Idade{ind('idade')}</th>
                    <th className="sortable" onClick={() => trocarOrdem('cns')} style={{ cursor: 'pointer' }}>CNS{ind('cns')}</th>
                    <th>Serviços vinculados</th>
                    <th className="sortable" onClick={() => trocarOrdem('ultima')} style={{ cursor: 'pointer' }}>Última visita{ind('ultima')}</th>
                    <th>Situação</th>
                  </tr></thead>
                  <tbody>
                    {lista.map((p) => (
                      <LinhaPaciente key={p.id} paciente={p} servicos={servicosDe(p)}
                        alerta={!!data.alertaDoPaciente(p.id)} ultimaVisita={data.ultimaVisita(p.id)} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="pac-cards" style={{ padding: 'var(--sp-3)' }}>
                {lista.map((p) => (
                  <CartaoPaciente key={p.id} paciente={p} servicos={servicosDe(p)} alerta={!!data.alertaDoPaciente(p.id)} />
                ))}
              </div>
            )}
            <div className="card-foot u-row u-between u-gap-3 u-wrap">
              <span className="u-xs u-muted">
                {U.pluralizar(lista.length, 'paciente exibido', 'pacientes exibidos')} · nomes e CNS parcialmente ocultos por padrão (LGPD)
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
