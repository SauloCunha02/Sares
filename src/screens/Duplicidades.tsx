/* SARES — Duplicidades. Porte de js/screens/duplicidades.js.
   Duas frentes: cadastros duplicados e sobreposição de atendimento. */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Vazio, Abas, Avatar, ChipServico, BadgePrioridade } from '../components/ui';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/AuthContext';
import { useData } from '../lib/DataContext';
import { useMutations } from '../lib/mutations';
import { useTopbar } from '../lib/TopbarContext';
import {
  pode, podeResolverAlerta, podeManterSobreposicao, podeCancelarVinculoDeSobreposicao, alertaVisivel
} from '../lib/permissions';
import { CAMPOS_COMPARACAO, valorCampo, rotuloNivel } from '../lib/dedup';
import { U } from '../lib/utils';
import { log as auditLog } from '../lib/audit';
import { confirmar, abrirModal, fecharModal } from '../lib/modal';
import { ok as toastOk, info as toastInfo, aviso as toastAviso } from '../lib/toast';
import type { Alerta, FilaItem, Paciente, Usuario } from '../lib/types';

export default function Duplicidades() {
  const { usuario } = useAuth();
  const data = useData();
  const mut = useMutations();
  _mutationsAtual = mut;
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const permitido = !!usuario && pode(usuario, 'ver_duplicidades');
  const aba = params.get('aba') || 'cadastro';

  const relevante = (a: Alerta) => alertaVisivel(usuario, a, data.alertaDoServico);
  const cadastros = permitido ? data.alertasAbertos('cadastro').filter(relevante) : [];
  const sobreposicoes = permitido ? data.alertasAbertos('atendimento').filter(relevante) : [];
  const resolvidos = permitido ? data.alertas.filter((a) => a.status === 'mesclado').filter(relevante) : [];
  const historico = permitido ? data.alertas.filter((a) => a.status !== 'aberto').filter(relevante) : [];

  useTopbar('Duplicidades', permitido
    ? (cadastros.length + sobreposicoes.length) + ' alerta(s) ' + (usuario?.perfil === 'gestor' ? 'abertos na rede' : 'relevantes a você')
    : undefined);

  if (!usuario) return null;

  if (!permitido) {
    return <div className="view-narrow">
      <Vazio icone="cadeado" titulo="Tela restrita" texto="Seu perfil não tem acesso à gestão de duplicidades."
        acao={<a className="btn btn-secondary" href="#/inicio" onClick={(e) => { e.preventDefault(); navigate('/inicio'); }}>Voltar</a>} />
    </div>;
  }

  const vagasLiberadas = resolvidos.length * 3;

  async function varrer() {
    if (!pode(usuario, 'resolver_duplicidade')) return;
    const novosCad = await mut.sincronizarAlertasCadastro();
    const novasSob = await mut.detectarSobreposicoes();
    if (novosCad + novasSob) toastAviso('Varredura concluída', novosCad + ' cadastro(s) e ' + novasSob + ' sobreposição(ões) adicionados à lista.');
    else toastOk('Varredura concluída', 'Nenhuma duplicidade nova encontrada na base.');
  }

  return (
    <div className="view-wide">
      <div className="page-head">
        <div className="ph-title"><h1>Duplicidades</h1><p>O mesmo paciente registrado duas vezes ocupa dois lugares na fila. Resolver isso devolve vagas reais à rede.</p></div>
        <div className="ph-actions">
          {pode(usuario, 'resolver_duplicidade') ? <button className="btn btn-secondary" onClick={varrer}><Icon nome="busca" tamanho={16} /> Varrer base agora</button> : null}
        </div>
      </div>

      <div className="savings">
        <span className="sv-icon" aria-hidden="true"><Icon nome="check" tamanho={20} /></span>
        <div className="u-grow">
          <div className="sv-num">{U.pluralizar(resolvidos.length, 'duplicidade resolvida', 'duplicidades resolvidas')}</div>
          <div className="sv-txt">≈ {vagasLiberadas} vagas devolvidas às filas da rede · cada cadastro repetido consome atendimento, transporte e tempo de profissional.</div>
        </div>
      </div>

      <Abas
        itens={[
          { id: 'cadastro', rotulo: 'Cadastros duplicados', contador: cadastros.length },
          { id: 'atendimento', rotulo: 'Sobreposição de atendimento', contador: sobreposicoes.length },
          { id: 'historico', rotulo: 'Histórico', contador: historico.length }
        ]}
        ativa={aba}
        aoTrocar={(a) => navigate('/duplicidades?aba=' + a)}
      />

      <div className="u-mt-4">
        {aba === 'cadastro' && <AbaCadastros alertas={cadastros} />}
        {aba === 'atendimento' && <AbaSobreposicoes alertas={sobreposicoes} />}
        {aba === 'historico' && <AbaHistorico lista={historico} />}
      </div>
    </div>
  );
}

/* ===================== Cadastros duplicados ===================== */
function AbaCadastros({ alertas }: { alertas: Alerta[] }) {
  const data = useData();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  if (!alertas.length) {
    return <div className="card"><div className="card-body">
      <Vazio icone="check" titulo="Nenhum cadastro duplicado em aberto" texto="A base está limpa. Novos alertas aparecem automaticamente quando o motor detecta semelhança." />
    </div></div>;
  }

  return (
    <>
      {U.ordenarPor(alertas, (a) => a.score, true).map((a) => {
        const p1 = data.paciente(a.pacienteIds[0]);
        const p2 = data.paciente(a.pacienteIds[1]);
        if (!p1 || !p2) return null;
        const classe = a.score >= 95 ? 'score-high' : (a.score >= 80 ? '' : 'score-low');
        const corScore = a.score >= 95 ? 'var(--atlas-danger)' : (a.score >= 80 ? 'var(--atlas-warning)' : 'var(--atlas-text-muted)');
        const podeAgir = podeResolverAlerta(usuario, a, data.alertaDoServico);

        return (
          <div className={'dup-card ' + classe} key={a.id}>
            <div className="dup-head">
              <div className="dup-score">
                <div><div className="ds-num" style={{ color: corScore }}>{a.score}</div><div className="ds-lbl">de similaridade</div></div>
                <div><div className="u-bold">{rotuloNivel(a.score)}</div><div className="u-xs u-muted">Detectado em {U.fmtTimestamp(a.detectadoEm)}</div></div>
              </div>
              <div className="dup-criterios">
                {a.criterios.map((cr, i) => {
                  const destaque = /idêntic|DIFERENTES/i.test(cr);
                  return <span className={'badge ' + (/DIFERENTES/.test(cr) ? 'badge-bad' : (destaque ? 'badge-warn' : 'badge-muted'))} key={i}>{cr}</span>;
                })}
              </div>
            </div>

            <div className="dup-compare">
              <div className="dc-key" />
              <div className="dc-header">{p1.nomeCompleto}<br /><span className="u-xs u-faint">prontuário {p1.numeroProntuario} · aberto em {U.fmtData(p1.dataAbertura)}</span></div>
              <div className="dc-header">{p2.nomeCompleto}<br /><span className="u-xs u-faint">prontuário {p2.numeroProntuario} · aberto em {U.fmtData(p2.dataAbertura)}</span></div>

              {CAMPOS_COMPARACAO.map((campo) => {
                const v1 = valorCampo(p1, campo.chave, data.servicosDoPaciente, data.siglaServico);
                const v2 = valorCampo(p2, campo.chave, data.servicosDoPaciente, data.siglaServico);
                const t1 = campo.fmt ? campo.fmt(v1) : ((v1 as string) || '— não informado —');
                const t2 = campo.fmt ? campo.fmt(v2) : ((v2 as string) || '— não informado —');
                const igual = U.normalizar(String(v1 || '')) === U.normalizar(String(v2 || '')) && !!v1;
                const cls = igual ? 'dc-same' : 'dc-diff';
                return (
                  <div key={campo.chave} style={{ display: 'contents' }}>
                    <div className="dc-key">{campo.rotulo}</div>
                    <div className={cls}>{t1}</div>
                    <div className={cls}>{t2}</div>
                  </div>
                );
              })}
            </div>

            <div className="dup-actions">
              {podeAgir ? (
                <>
                  <button className="btn btn-ghost" onClick={() => toastInfo('Alerta adiado', 'Ele continua na lista para análise posterior.')}>Adiar</button>
                  <button className="btn btn-secondary" onClick={() => descartarAlerta(a, data, usuario!)}>São pessoas diferentes</button>
                  <button className="btn btn-primary" onClick={() => abrirMesclagem(a, p1, p2, data, usuario!, navigate)}><Icon nome="mesclar" tamanho={16} /> Mesclar registros</button>
                </>
              ) : <span className="u-xs u-faint u-row">Somente a coordenação do serviço envolvido pode decidir</span>}
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ===================== Sobreposição de atendimento ===================== */
function AbaSobreposicoes({ alertas }: { alertas: Alerta[] }) {
  const data = useData();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  if (!alertas.length) {
    return <div className="card"><div className="card-body">
      <Vazio icone="check" titulo="Nenhuma sobreposição de atendimento" texto="Ninguém está aguardando a mesma especialidade em dois serviços ao mesmo tempo." />
    </div></div>;
  }

  return (
    <>
      {alertas.map((a) => {
        const p = data.paciente(a.pacienteIds[0]);
        if (!p) return null;
        let filas = (a.filaIds || []).map((id) => data.filaItem(id)).filter((f): f is FilaItem => !!f);
        if (!filas.length) filas = data.filasDoPaciente(p.id).filter((f) => (a.criterios[0] || '').indexOf(f.especialidade) >= 0);

        return (
          <div className="dup-card score-high" key={a.id}>
            <div className="dup-head">
              <div className="dup-score">
                <Avatar nome={p.nomeCompleto} cor="var(--atlas-danger)" />
                <div><div className="u-bold">{p.nomeCompleto}</div><div className="u-xs u-muted">{U.idadeTexto(p.dataNascimento)} · {p.endereco.bairro}</div></div>
              </div>
              <div className="dup-criterios">{a.criterios.map((cr, i) => <span className="badge badge-bad" key={i}>{cr}</span>)}</div>
            </div>

            <div className="card-body">
              <div className="alert alert-warn">
                <span className="a-icon" aria-hidden="true"><Icon nome="alerta" tamanho={16} /></span>
                <div><div className="a-title">Dois serviços preparando o mesmo atendimento</div>
                  <div>Duas equipes reservam agenda para a mesma necessidade. Manter um vínculo e encerrar o outro libera uma vaga imediata para outra criança da fila.</div></div>
              </div>

              <div className="table-wrap u-mt-4"><table className="table"><thead><tr>
                <th>Serviço</th><th>Especialidade</th><th>Prioridade</th><th>Entrada</th><th>Espera</th><th>Origem</th><th></th>
              </tr></thead><tbody>
                {filas.map((f) => {
                  const sv = data.servico(f.servicoId);
                  const podeCancelar = podeCancelarVinculoDeSobreposicao(usuario, f);
                  return (
                    <tr key={f.id}>
                      <td><ChipServico sigla={sv?.sigla || '—'} cor={sv?.cor || '#999'} nome={sv?.nome || ''} /></td>
                      <td>{f.especialidade}</td>
                      <td><BadgePrioridade prioridade={f.prioridade} /></td>
                      <td className="u-sm u-nowrap">{U.fmtData(f.dataEntrada)}</td>
                      <td className="num">{U.diffDias(f.dataEntrada)} dias</td>
                      <td className="u-sm u-muted">{f.observacao || '—'}</td>
                      <td className="u-right">
                        {podeCancelar
                          ? <button className="btn btn-sm btn-danger-soft" onClick={() => cancelarVinculo(f, a, data, usuario!)}>Cancelar este vínculo</button>
                          : (usuario?.perfil === 'coordenador' ? <span className="u-xs u-faint">só a coordenação do {data.siglaServico(f.servicoId)}</span> : null)}
                      </td>
                    </tr>
                  );
                })}
              </tbody></table></div>
            </div>

            <div className="dup-actions">
              <a className="btn btn-ghost" href={'#/paciente/' + p.id + '?aba=filas'} onClick={(e) => { e.preventDefault(); navigate('/paciente/' + p.id + '?aba=filas'); }}>Ver prontuário</a>
              {podeManterSobreposicao(usuario)
                ? <button className="btn btn-secondary" onClick={() => descartarAlerta(a, data, usuario!)}>Manter os dois (há justificativa clínica)</button>
                : <span className="u-xs u-faint u-row">Decide pelos dois serviços — só a gestão</span>}
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ===================== Histórico ===================== */
function AbaHistorico({ lista }: { lista: Alerta[] }) {
  const data = useData();
  const ordenada = U.ordenarPor(lista, (a) => a.resolvidoEm || 0, true);

  if (!ordenada.length) {
    return <div className="card"><div className="card-body"><Vazio icone="auditoria" titulo="Nenhum alerta resolvido ainda" texto="O histórico de decisões aparece aqui." /></div></div>;
  }

  return (
    <div className="card"><div className="table-wrap"><table className="table"><thead><tr>
      <th>Pacientes</th><th>Tipo</th><th>Score</th><th>Decisão</th><th>Resolvido por</th><th>Quando</th><th>Observação</th>
    </tr></thead><tbody>
      {ordenada.map((a) => {
        const nomes = a.pacienteIds.map((id) => data.paciente(id)?.nomeCompleto || '—').join(' × ');
        const decisao = a.status === 'mesclado' ? <span className="badge badge-ok">Mesclado</span>
          : a.status === 'descartado' ? <span className="badge badge-muted">Pessoas diferentes</span>
            : <span className="badge badge-warn">{a.status}</span>;
        return (
          <tr key={a.id}>
            <td className="u-sm">{nomes}</td>
            <td className="u-sm">{a.tipo === 'cadastro' ? 'Cadastro' : 'Atendimento'}</td>
            <td className="num">{a.score}</td>
            <td>{decisao}</td>
            <td className="u-sm">{data.nomeUsuario(a.resolvidoPor)}</td>
            <td className="u-sm u-nowrap">{a.resolvidoEm ? U.fmtTimestamp(a.resolvidoEm) : '—'}</td>
            <td className="u-xs u-muted">{a.observacao || '—'}</td>
          </tr>
        );
      })}
    </tbody></table></div></div>
  );
}

/* ===================== Ações ===================== */
function descartarAlerta(a: Alerta, data: ReturnType<typeof useData>, usuario: Usuario) {
  const podeAgir = a.tipo === 'atendimento' ? podeManterSobreposicao(usuario) : podeResolverAlerta(usuario, a, data.alertaDoServico);
  if (!podeAgir) return;

  confirmar({
    titulo: a.tipo === 'cadastro' ? 'Confirmar que são pessoas diferentes' : 'Manter os dois vínculos',
    mensagem: a.tipo === 'cadastro'
      ? 'O alerta será encerrado e os dois cadastros permanecem independentes. Registre o que confirmou a distinção.'
      : 'Os dois vínculos permanecem ativos. Registre a justificativa clínica para a duplicidade.',
    rotuloConfirmar: 'Confirmar', exigeJustificativa: true,
    placeholderJustificativa: a.tipo === 'cadastro' ? 'ex.: confirmado com a família — são primas homônimas, mães diferentes' : 'ex.: abordagens terapêuticas distintas e complementares'
  }, async (just) => {
    // resolverAlerta (mutations) já grava audit "descartou_alerta"/"mesclou_cadastros"; aqui é sempre "descartado".
    const mut = obterMutations();
    await mut.resolverAlerta(a.id, 'descartado', just || '');
    await auditLog(usuario, 'descartou_alerta', 'alerta', a.id, a.pacienteIds[0], 'Justificativa: "' + just + '"');
    toastOk('Alerta encerrado', 'A decisão e a justificativa ficaram registradas.');
  });
}

function cancelarVinculo(f: FilaItem, a: Alerta, data: ReturnType<typeof useData>, usuario: Usuario) {
  if (!podeCancelarVinculoDeSobreposicao(usuario, f)) return;
  const p = data.paciente(f.pacienteId);

  confirmar({
    titulo: 'Cancelar vínculo de fila',
    subtitulo: (p ? p.nomeCompleto : '') + ' · ' + data.siglaServico(f.servicoId) + ' — ' + f.especialidade,
    mensagem: 'A vaga será liberada imediatamente para a próxima pessoa da fila. O paciente segue atendido na mesma especialidade pelo outro serviço.',
    rotuloConfirmar: 'Cancelar vínculo e liberar vaga', perigo: true, exigeJustificativa: true,
    placeholderJustificativa: 'ex.: atendimento mantido no outro serviço, mais próximo da residência'
  }, async (just) => {
    const mut = obterMutations();
    await mut.atualizarFila(f.id, { status: 'desistencia', observacao: just || '' });
    await mut.resolverAlerta(a.id, 'mesclado', 'Vínculo cancelado em ' + data.siglaServico(f.servicoId) + ' — ' + just);
    await auditLog(usuario, 'removeu_fila', 'fila', f.id, f.pacienteId, 'Sobreposição resolvida · ' + data.siglaServico(f.servicoId) + ' — Justificativa: "' + just + '"');
    toastOk('Vaga liberada', 'A sobreposição foi resolvida e a fila do ' + data.siglaServico(f.servicoId) + ' avançou uma posição.');
  });
}

function abrirMesclagem(a: Alerta, p1: Paciente, p2: Paciente, data: ReturnType<typeof useData>, usuario: Usuario, navigate: (path: string) => void) {
  const principal = p1.dataAbertura <= p2.dataAbertura ? p1 : p2;
  const secundario = principal === p1 ? p2 : p1;
  const campos = CAMPOS_COMPARACAO.filter((cp) =>
    ['nomeCompleto', 'cns', 'cpf', 'nomeMae', 'telefone', 'escola', 'hipoteseDiagnostica', 'nivelSuporte'].includes(cp.chave));
  const atendimentosTotal = data.atendimentosDoPaciente(p1.id).length + data.atendimentosDoPaciente(p2.id).length;
  const filasTotal = data.filasDoPaciente(p1.id).length + data.filasDoPaciente(p2.id).length;

  const escolhas: Record<string, 'a' | 'b'> = {};
  campos.forEach((cp) => {
    const vA = (principal as unknown as Record<string, unknown>)[cp.chave];
    const vB = (secundario as unknown as Record<string, unknown>)[cp.chave];
    escolhas[cp.chave] = (!vA && !!vB) ? 'b' : 'a';
  });

  abrirModal({
    titulo: 'Mesclar cadastros',
    tamanho: 'lg',
    subtitulo: 'Escolha, campo a campo, qual valor permanece. Todo o histórico dos dois registros é preservado no cadastro final.',
    corpo: () => (
      <CorpoMesclagem principal={principal} secundario={secundario} campos={campos} escolhas={escolhas}
        atendimentosTotal={atendimentosTotal} filasTotal={filasTotal} />
    ),
    rodape: (fechar) => (
      <>
        <button className="btn btn-secondary" onClick={fechar}>Cancelar</button>
        <button className="btn btn-primary" onClick={async () => {
          const valoresEscolhidos: Record<string, unknown> = {};
          campos.forEach((cp) => {
            valoresEscolhidos[cp.chave] = escolhas[cp.chave] === 'a'
              ? (principal as unknown as Record<string, unknown>)[cp.chave]
              : (secundario as unknown as Record<string, unknown>)[cp.chave];
          });

          const mut = obterMutations();
          const resultado = await mut.mesclarPacientes(principal.id, secundario.id, valoresEscolhidos as never);
          if (!resultado) return;
          await mut.resolverAlerta(a.id, 'mesclado', 'Prontuário ' + secundario.numeroProntuario + ' mesclado em ' + principal.numeroProntuario);
          await auditLog(usuario, 'mesclou_cadastros', 'paciente', principal.id, principal.id,
            'Prontuários ' + principal.numeroProntuario + ' + ' + secundario.numeroProntuario + ' · ' + atendimentosTotal + ' atendimentos consolidados');

          const consolidadas = resultado.filasConsolidadas || [];
          for (const f of consolidadas) {
            await auditLog(usuario, 'consolidou_filas', 'fila', f.id, principal.id, 'Vínculo duplicado encerrado em ' + data.siglaServico(f.servicoId) + ' — ' + f.especialidade);
          }

          fecharModal();
          toastOk('Cadastros mesclados', principal.nomeCompleto + ' agora tem um único prontuário.', [
            atendimentosTotal + ' atendimentos reunidos em uma linha do tempo',
            consolidadas.length
              ? filasTotal + ' vínculos de fila revisados · ' + consolidadas.length + ' vaga(s) duplicada(s) liberada(s) para outra pessoa'
              : filasTotal + ' vínculos de fila consolidados',
            'Registro arquivado, não apagado — rastreável na auditoria'
          ]);
          navigate('/paciente/' + principal.id);
        }}><Icon nome="mesclar" tamanho={16} /> Confirmar mesclagem</button>
      </>
    )
  });
}

function CorpoMesclagem({ principal, secundario, campos, escolhas, atendimentosTotal, filasTotal }: {
  principal: Paciente; secundario: Paciente; campos: typeof CAMPOS_COMPARACAO; escolhas: Record<string, 'a' | 'b'>;
  atendimentosTotal: number; filasTotal: number;
}) {
  const [, render] = useState(0);
  return (
    <>
      <div className="alert alert-ok u-mb-4">
        <span className="a-icon" aria-hidden="true"><Icon nome="info" tamanho={16} /></span>
        <div><div className="a-title">O que acontece ao mesclar</div>
          <div className="u-sm">{atendimentosTotal} atendimentos e {filasTotal} vínculos de fila migram para o prontuário nº {principal.numeroProntuario}.
            O registro nº {secundario.numeroProntuario} é arquivado, nunca apagado, e a ação fica na trilha de auditoria.</div></div>
      </div>

      <div className="merge-row" style={{ borderBottom: '2px solid var(--atlas-border)' }}>
        <span className="mr-key">Campo</span>
        <span className="u-sm u-bold">Prontuário {principal.numeroProntuario} <span className="badge badge-ok">principal</span></span>
        <span className="u-sm u-bold">Prontuário {secundario.numeroProntuario}</span>
      </div>

      {campos.map((cp) => {
        const vA = (principal as unknown as Record<string, unknown>)[cp.chave];
        const vB = (secundario as unknown as Record<string, unknown>)[cp.chave];
        const tA = cp.fmt ? cp.fmt(vA) : ((vA as string) || '— vazio —');
        const tB = cp.fmt ? cp.fmt(vB) : ((vB as string) || '— vazio —');
        const iguais = U.normalizar(String(vA || '')) === U.normalizar(String(vB || ''));

        return (
          <div className="merge-row" key={cp.chave}>
            <span className="mr-key">{cp.rotulo}</span>
            <label className={'merge-opt' + (escolhas[cp.chave] === 'a' ? ' is-on' : '')}>
              <input type="radio" name={'mg-' + cp.chave} checked={escolhas[cp.chave] === 'a'} onChange={() => { escolhas[cp.chave] = 'a'; render((n) => n + 1); }} />
              <span>{tA}</span>
            </label>
            {iguais ? <span className="u-xs u-faint u-row">idêntico</span> : (
              <label className={'merge-opt' + (escolhas[cp.chave] === 'b' ? ' is-on' : '')}>
                <input type="radio" name={'mg-' + cp.chave} checked={escolhas[cp.chave] === 'b'} onChange={() => { escolhas[cp.chave] = 'b'; render((n) => n + 1); }} />
                <span>{tB}</span>
              </label>
            )}
          </div>
        );
      })}
    </>
  );
}

/* Modais são abertos fora de componentes React (a partir de handlers de
   clique), então não têm acesso direto a useMutations() — este pequeno
   truque global resolve o hook uma vez, no componente, e guarda a
   referência para as funções de ação chamarem. */
let _mutationsAtual: ReturnType<typeof useMutations> | null = null;
function obterMutations() {
  if (!_mutationsAtual) throw new Error('mutations ainda não inicializado');
  return _mutationsAtual;
}
