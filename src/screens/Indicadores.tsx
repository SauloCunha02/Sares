/* SARES — Painel de indicadores. Porte de js/screens/indicadores.js. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Vazio, Kpi, SeletorSimples } from '../components/ui';
import { ChartBox } from '../components/ChartBox';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/AuthContext';
import { useData } from '../lib/DataContext';
import { useTopbar } from '../lib/TopbarContext';
import { pode } from '../lib/permissions';
import * as charts from '../lib/charts';
import { U } from '../lib/utils';
import { log as auditLog } from '../lib/audit';
import { ok as toastOk } from '../lib/toast';
import type { Atendimento, FilaItem } from '../lib/types';

export default function Indicadores() {
  const { usuario } = useAuth();
  const data = useData();
  const navigate = useNavigate();

  const permitido = !!usuario && pode(usuario, 'ver_indicadores');
  const [periodo, setPeriodo] = useState(90);
  const [servicoSel, setServicoSel] = useState(usuario?.perfil === 'coordenador' ? (usuario.servicoId || '') : '');

  const servico = servicoSel || null;
  const ind = permitido ? data.indicadores(periodo, servico) : null;
  const serie = permitido ? data.serieMensal(6, servico) : [];

  useTopbar('Indicadores', permitido
    ? (servico ? data.servico(servico)?.nome : 'Rede municipal completa') + ' · últimos ' + periodo + ' dias'
    : undefined);

  if (!usuario) return null;

  if (!permitido || !ind) {
    return <div className="view-narrow">
      <Vazio icone="cadeado" titulo="Painel restrito" texto="Os indicadores são visíveis à coordenação e à gestão municipal."
        acao={<a className="btn btn-secondary" href="#/inicio" onClick={(e) => { e.preventDefault(); navigate('/inicio'); }}>Voltar</a>} />
    </div>;
  }
  const ind2 = ind;

  function filasFiltradas(): FilaItem[] {
    return data.filas.filter((f) => (f.status === 'aguardando' || f.status === 'agendado') && (!servico || f.servicoId === servico));
  }

  function dadosPrioridade() {
    const fs = filasFiltradas();
    return (['URGENTE', 'CURTO PRAZO', 'LISTA DE ESPERA'] as const).map((p) => ({
      rotulo: p, valor: fs.filter((f) => f.prioridade === p).length, cor: charts.cores.prioridade[p]
    }));
  }

  function serieFaltas() {
    return serie.map((s) => ({ rotulo: s.rotulo, valor: s.total ? Math.round((s.faltou / s.total) * 100) : 0 }));
  }

  function dadosServico() {
    return U.ordenarPor(data.servicos.map((s) => ({ rotulo: s.sigla, valor: ind2.atendimentosLista.filter((a: Atendimento) => a.servicoId === s.id).length })), (d) => d.valor, true);
  }

  function dadosBairro() {
    const grupos = U.agruparPor(data.pacientes, (p) => p.endereco.bairro);
    return U.ordenarPor(Object.keys(grupos).map((b) => ({ rotulo: b, valor: grupos[b].length })), (d) => d.valor, true).slice(0, 8);
  }

  function dadosFunil() {
    const todos: { at: Atendimento; enc: Atendimento['encaminhamentos'][number] }[] = [];
    data.atendimentos.forEach((a) => {
      if (!servico || a.servicoId === servico) (a.encaminhamentos || []).forEach((e) => todos.push({ at: a, enc: e }));
    });
    const comFila = todos.filter((x) => data.filas.some((f) => f.encaminhamentoOrigemId === x.at.id));
    const atendidos = todos.filter((x) => data.atendimentos.some((y) =>
      y.pacienteId === x.at.pacienteId && y.servicoId === x.enc.servicoId && y.especialidade === x.enc.especialidade && y.data >= x.at.data && y.presenca === 'compareceu'));
    return [
      { rotulo: 'Encaminhamentos gerados', valor: todos.length },
      { rotulo: 'Convertidos em fila no destino', valor: comFila.length },
      { rotulo: 'Efetivamente atendidos', valor: atendidos.length }
    ];
  }

  function tabelaEspera() {
    const fs = filasFiltradas();
    const grupos = U.agruparPor(fs, (f) => f.especialidade);
    const linhas = U.ordenarPor(Object.keys(grupos).map((esp) => {
      const itens = grupos[esp];
      const media = Math.round(U.somar(itens, (f) => U.diffDias(f.dataEntrada)) / itens.length);
      const maior = Math.max(...itens.map((f) => U.diffDias(f.dataEntrada)));
      return { esp, total: itens.length, media, maior, urgentes: itens.filter((f) => f.prioridade === 'URGENTE').length };
    }), (l) => l.media, true);

    if (!linhas.length) return <div className="card-body"><Vazio icone="fila" titulo="Nenhuma fila ativa" texto="Não há pacientes aguardando neste recorte." /></div>;

    const maiorMedia = Math.max(...linhas.map((l) => l.media), 1);
    return (
      <div className="table-wrap"><table className="table"><thead><tr>
        <th>Especialidade</th><th>Aguardando</th><th>Urgentes</th><th>Espera média</th><th>Maior espera</th><th style={{ width: 180 }}>Relativo</th>
      </tr></thead><tbody>
        {linhas.map((l) => {
          const pct = Math.round((l.media / maiorMedia) * 100);
          const tom = l.media > 60 ? 'tone-bad' : (l.media > 30 ? 'tone-warn' : 'tone-ok');
          return (
            <tr key={l.esp}>
              <td className="u-medium">{l.esp}</td>
              <td className="num">{l.total}</td>
              <td className="num">{l.urgentes ? <span className="badge badge-bad">{l.urgentes}</span> : '—'}</td>
              <td className="num u-bold">{l.media} dias</td>
              <td className="num u-muted">{l.maior} dias</td>
              <td><div className={'progress ' + tom}><i style={{ width: pct + '%' }} /></div></td>
            </tr>
          );
        })}
      </tbody></table></div>
    );
  }

  async function exportar() {
    await auditLog(usuario, 'exportou_dados', 'indicadores', null, null, 'Painel de indicadores — ' + periodo + ' dias' + (servico ? ' · ' + data.siglaServico(servico) : ''));
    const linhas: (string | number)[][] = [
      ['Pessoas em acompanhamento', ind2.pacientesAtivos], ['Atendimentos no período', ind2.atendimentos],
      ['Taxa de comparecimento (%)', ind2.comparecimento], ['Faltas no período', ind2.faltas],
      ['Espera média (dias)', ind2.esperaMedia], ['Pessoas na fila', ind2.naFila], ['Urgentes na fila', ind2.urgentes],
      ['Encaminhamentos ativos', ind2.encaminhamentosAtivos], ['Duplicidades abertas', ind2.duplicidadesAbertas],
      ['Duplicidades resolvidas', ind2.duplicidadesResolvidas], ['', ''], ['Mês', 'Total / Compareceu / Faltou'],
      ...serie.map((s) => [s.rotulo, s.total + ' / ' + s.compareceu + ' / ' + s.faltou])
    ];
    U.baixarCSV('sares-indicadores-' + U.hojeISO() + '.csv', ['Indicador', 'Valor'], linhas);
    toastOk('Indicadores exportados', 'Arquivo CSV gerado. A exportação consta na auditoria.');
  }

  const variacao = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null);

  return (
    <div className="view-wide">
      <div className="page-head">
        <div className="ph-title"><h1>Indicadores da rede</h1><p>O que antes estava em cadernos de papel, agora medido em tempo real.</p></div>
        <div className="ph-actions"><button className="btn btn-secondary" onClick={exportar}><Icon nome="baixar" tamanho={16} /> Exportar CSV</button></div>
      </div>

      <div className="toolbar">
        <SeletorSimples rotuloVazio="" ariaLabel="Período" valor={String(periodo)}
          opcoes={[30, 90, 180].map((d) => ({ valor: String(d), rotulo: 'Últimos ' + d + ' dias' }))}
          onChange={(v) => setPeriodo(Number(v))} />
        {usuario.perfil === 'gestor' ? (
          <SeletorSimples rotuloVazio="Toda a rede" ariaLabel="Serviço" valor={servicoSel}
            opcoes={data.servicos.map((s) => ({ valor: s.id, rotulo: s.sigla }))}
            onChange={setServicoSel} />
        ) : <span className="badge">{data.siglaServico(servico)}</span>}
      </div>

      <div className="grid grid-6">
        <Kpi rotulo="Pessoas em acompanhamento" valor={ind.pacientesAtivos} delta={variacao(ind.pacientesAtivos, ind.pacientesAtivosAnterior)} />
        <Kpi rotulo="Atendimentos no período" valor={ind.atendimentos} delta={variacao(ind.atendimentos, ind.atendimentosAnterior)} />
        <Kpi rotulo="Taxa de comparecimento" valor={ind.comparecimento} unidade="%" delta={ind.comparecimento - ind.comparecimentoAnterior} />
        <Kpi rotulo="Espera média" valor={ind.esperaMedia} unidade="dias" nota={ind.naFila + ' na fila'} />
        <Kpi rotulo="Encaminhamentos ativos" valor={ind.encaminhamentosAtivos} nota="entre serviços" />
        <Kpi rotulo="Duplicidades abertas" valor={ind.duplicidadesAbertas} nota={ind.duplicidadesResolvidas + ' já resolvidas'} />
      </div>

      <div className="grid grid-2 split u-mt-5">
        <Card titulo="Atendimentos por mês" subtitulo="Comparecimentos e faltas nos últimos 6 meses"><ChartBox html={charts.barrasMensais(serie)} /></Card>
        <Card titulo="Fila por prioridade" subtitulo="Quem aguarda, por classificação"><ChartBox html={charts.rosca(dadosPrioridade())} /></Card>
      </div>

      <div className="grid grid-2 u-mt-4">
        <Card titulo="Taxa de faltas" subtitulo="Percentual de ausências por mês — quanto menor, melhor"><ChartBox html={charts.linha(serieFaltas(), { sufixo: '%' })} /></Card>
        <Card titulo="Atendimentos por serviço" subtitulo="No período selecionado"><ChartBox html={charts.barrasHorizontais(dadosServico(), { larguraRotulo: 110 })} /></Card>
      </div>

      <div className="grid grid-2 u-mt-4">
        <Card titulo="Pacientes por bairro" subtitulo="Onde está a demanda no município"><ChartBox html={charts.barrasHorizontais(dadosBairro(), { larguraRotulo: 150 })} /></Card>
        <Card titulo="Funil de encaminhamentos" subtitulo="Da indicação ao atendimento efetivo"><ChartBox html={charts.funil(dadosFunil())} /></Card>
      </div>

      <div className="card u-mt-4">
        <div className="card-head"><div><h3>Tempo médio de espera por especialidade</h3><p className="u-xs u-muted u-mt-2">Base para decidir onde ampliar a equipe</p></div></div>
        {tabelaEspera()}
      </div>
    </div>
  );
}

function Card({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="card-head"><div><h3>{titulo}</h3>{subtitulo ? <p className="u-xs u-muted u-mt-2">{subtitulo}</p> : null}</div></div>
      <div className="card-body">{children}</div>
    </div>
  );
}
