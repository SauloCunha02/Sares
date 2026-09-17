/* SARES — Filas de atendimento. Porte de js/screens/filas.js.
   Mantém o mesmo estado module-level do original (estado.servico/especialidade
   sobrevive entre navegações) via um objeto fora do componente — troquei só
   a forma de disparar repintura (setState local em vez de router.resolver()). */
import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Dropdown, Campo } from '../components/ui';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/AuthContext';
import { useData } from '../lib/DataContext';
import { useMutations } from '../lib/mutations';
import { useTopbar } from '../lib/TopbarContext';
import { pode, podeGerenciarFila, podeAgendarNestaFila } from '../lib/permissions';
import { U } from '../lib/utils';
import { log as auditLog } from '../lib/audit';
import { confirmar, abrirModal, fecharModal } from '../lib/modal';
import { ok as toastOk, info as toastInfo, aviso as toastAviso } from '../lib/toast';
import type { FilaItem, Prioridade, Usuario } from '../lib/types';

const PRIORIDADES: Prioridade[] = ['URGENTE', 'CURTO PRAZO', 'LISTA DE ESPERA'];
const CLASSES: Record<Prioridade, string> = { 'URGENTE': 'prio-urgente', 'CURTO PRAZO': 'prio-curto', 'LISTA DE ESPERA': 'prio-espera' };

/* Sobrevive entre navegações dentro da mesma sessão do navegador, igual ao
   `estado` module-level do protótipo original. */
const estadoPersistente: { servico: string | null; especialidade: string; espPara: string | null } = {
  servico: null, especialidade: '', espPara: null
};

function esperaMedia(itens: FilaItem[]): number {
  if (!itens.length) return 0;
  return Math.round(U.somar(itens, (f) => U.diffDias(f.dataEntrada)) / itens.length);
}

export default function Filas() {
  const { usuario } = useAuth();
  const data = useData();
  const mut = useMutations();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [, render] = useState(0);

  const permitido = !!usuario && pode(usuario, 'ver_fila');
  const u = permitido ? usuario! : null;

  if (u) {
    if (estadoPersistente.servico === null) estadoPersistente.servico = u.servicoId || data.servicos[0]?.id || null;
    if (params.get('servico')) estadoPersistente.servico = params.get('servico');
    if (u.perfil === 'profissional' || u.perfil === 'recepcao') estadoPersistente.servico = u.servicoId;

    if (estadoPersistente.espPara !== u.id) {
      estadoPersistente.especialidade = (u.perfil === 'profissional' && u.especialidade) ? u.especialidade : '';
      estadoPersistente.espPara = u.id;
    }
    if (u.perfil === 'profissional') estadoPersistente.especialidade = u.especialidade || '';
  }

  const servico = u ? data.servico(estadoPersistente.servico) : null;
  const podeEscolherServico = !!u && (u.perfil === 'coordenador' || u.perfil === 'gestor');
  const podeEscolherEspecialidade = !!u && u.perfil !== 'profissional';

  useTopbar(permitido ? 'Filas de atendimento' : 'Acesso restrito', servico?.nome);

  if (!usuario) return null;

  if (!permitido || !u) {
    return <div className="view-narrow">
      <VazioRestrito onVoltar={() => navigate('/inicio')} />
    </div>;
  }

  if (!servico) return null;

  const itens = data.filasDoServico(estadoPersistente.servico || undefined, estadoPersistente.especialidade || undefined);

  function repintar() { render((n) => n + 1); }

  async function alterarPrioridade(filaId: string, nova: Prioridade) {
    const f = data.filaItem(filaId);
    if (!f || f.prioridade === nova) return;
    if (!podeGerenciarFila(u, f)) return;
    const p = data.paciente(f.pacienteId);
    const anterior = f.prioridade;

    await mut.atualizarFila(filaId, { prioridade: nova });
    await auditLog(u, 'alterou_prioridade', 'fila', filaId, f.pacienteId,
      'De "' + anterior + '" para "' + nova + '" em ' + data.siglaServico(f.servicoId) + ' — ' + f.especialidade);
    toastOk('Prioridade alterada', (p ? p.nomeCompleto : 'Paciente') + ' passou de ' + anterior + ' para ' + nova + '.');
  }

  async function desagendarItem(filaId: string) {
    const fd = data.filaItem(filaId);
    if (!fd || !podeAgendarNestaFila(u, fd)) return;
    await mut.desagendar(filaId);
    await auditLog(u, 'agendou_atendimento', 'fila', filaId, fd.pacienteId, 'Agendamento desfeito — paciente volta a aguardar');
    toastInfo('Agendamento desfeito', 'A pessoa volta para a fila de espera.');
  }

  function abrirAgendamento(filaId: string) {
    const f = data.filaItem(filaId);
    if (!f || !podeAgendarNestaFila(u, f)) return;
    const p = data.paciente(f.pacienteId);
    const formState = { data: f.dataAgendada || U.addDias(U.hojeISO(), 7), hora: f.horarioAgendado || '08:00' };

    abrirModal({
      titulo: f.status === 'agendado' ? 'Reagendar atendimento' : 'Agendar atendimento',
      subtitulo: (p ? p.nomeCompleto : '') + ' · ' + data.siglaServico(f.servicoId) + ' — ' + f.especialidade,
      corpo: () => (
        <div>
          <div className="form-grid">
            <Campo rotulo="Data" type="date" obrigatorio defaultValue={formState.data} onChange={(e) => { formState.data = e.target.value; }} />
            <Campo rotulo="Horário" type="time" defaultValue={formState.hora} onChange={(e) => { formState.hora = e.target.value; }} />
          </div>
          <div className="u-mt-3">
            <div className="alert alert-ok">
              <span className="a-icon" aria-hidden="true"><Icon nome="info" tamanho={16} /></span>
              <div><div className="a-title">A pessoa continua vinculada ao serviço</div>
                <div>Agendar não tira ninguém da fila: apenas marca quando o atendimento vai acontecer. A espera acumulada desde {U.fmtData(f.dataEntrada)} é preservada.</div></div>
            </div>
          </div>
        </div>
      ),
      rodape: (fechar) => (
        <>
          <button className="btn btn-secondary" onClick={fechar}>Cancelar</button>
          <button className="btn btn-primary" onClick={async () => {
            if (!formState.data) { toastAviso('Data obrigatória', 'Escolha a data do atendimento.'); return; }
            if (formState.data < U.hojeISO()) { toastAviso('Data no passado', 'O agendamento precisa ser de hoje em diante.'); return; }
            await mut.agendar(filaId, formState.data, formState.hora);
            await auditLog(u, 'agendou_atendimento', 'fila', filaId, f.pacienteId,
              data.siglaServico(f.servicoId) + ' — ' + f.especialidade + ' · ' + U.fmtData(formState.data) + (formState.hora ? ' às ' + formState.hora : ''));
            fecharModal();
            toastOk('Atendimento agendado', (p ? p.nomeCompleto : 'Paciente') + ' · ' + U.fmtData(formState.data) + (formState.hora ? ' às ' + formState.hora : ''));
          }}>Confirmar agendamento</button>
        </>
      )
    });
  }

  function removerDaFila(filaId: string) {
    const f = data.filaItem(filaId);
    if (!f || !podeGerenciarFila(u, f)) return;
    const p = data.paciente(f.pacienteId);

    confirmar({
      titulo: 'Remover da fila', subtitulo: p ? p.nomeCompleto : '',
      mensagem: 'O vínculo com ' + data.siglaServico(f.servicoId) + ' — ' + f.especialidade + ' será encerrado. O histórico de atendimentos permanece no prontuário.',
      rotuloConfirmar: 'Remover', perigo: true, exigeJustificativa: true,
      placeholderJustificativa: 'ex.: atendimento duplicado, já acompanhado em outro serviço'
    }, async (just) => {
      await mut.atualizarFila(filaId, { status: 'desistencia', observacao: just || '' });
      await auditLog(u, 'removeu_fila', 'fila', filaId, f.pacienteId,
        data.siglaServico(f.servicoId) + ' — ' + f.especialidade + ' — Justificativa: "' + just + '"');
      toastOk('Vínculo removido', 'Uma vaga foi liberada nesta fila.');
    });
  }

  async function exportarFila() {
    await auditLog(u, 'exportou_dados', 'fila', null, null, 'Exportação da fila do ' + servico!.sigla);
    U.baixarCSV('sares-fila-' + U.normalizar(servico!.sigla).replace(/ /g, '-') + '-' + U.hojeISO() + '.csv',
      ['Posição', 'Prioridade', 'Paciente', 'Idade', 'CNS', 'Especialidade', 'Entrada', 'Dias de espera', 'Origem'],
      U.ordenarPor(itens, (f) => ({ 'URGENTE': 0, 'CURTO PRAZO': 1, 'LISTA DE ESPERA': 2 }[f.prioridade] + '|' + f.dataEntrada))
        .map((f) => {
          const p = data.paciente(f.pacienteId);
          return [f.posicao, f.prioridade, p?.nomeCompleto || '', p ? U.idade(p.dataNascimento) : '', p ? U.fmtCNS(p.cns) : '',
            f.especialidade, U.fmtData(f.dataEntrada), U.diffDias(f.dataEntrada), f.origem];
        }));
    toastOk('Fila exportada', itens.length + ' registros em CSV.');
  }

  return (
    <div className="view-wide">
      <div className="page-head">
        <div className="ph-title">
          <h1>Fila do {servico.sigla}</h1>
          <p>{U.pluralizar(itens.length, 'pessoa aguardando', 'pessoas aguardando')} · espera média de {esperaMedia(itens)} dias
            {pode(u, 'priorizar_fila') ? ' · arraste os cartões para repriorizar' : ''}</p>
        </div>
        <div className="ph-actions">
          <button className="btn btn-secondary" onClick={exportarFila}><Icon nome="baixar" tamanho={16} /> Exportar fila</button>
        </div>
      </div>

      <div className="toolbar">
        {podeEscolherServico ? (
          <select className="select" aria-label="Serviço" value={estadoPersistente.servico || ''}
            onChange={(e) => { estadoPersistente.servico = e.target.value; estadoPersistente.especialidade = ''; navigate('/filas'); repintar(); }}>
            {data.servicos.map((s) => <option value={s.id} key={s.id}>{s.sigla} — {s.nome}</option>)}
          </select>
        ) : <span className="badge">{servico.sigla}</span>}

        {podeEscolherEspecialidade ? (
          <select className="select" aria-label="Especialidade" value={estadoPersistente.especialidade}
            onChange={(e) => { estadoPersistente.especialidade = e.target.value; repintar(); }}>
            <option value="">Todas as especialidades</option>
            {servico.especialidades.map((esp) => <option value={esp} key={esp}>{esp}</option>)}
          </select>
        ) : <span className="badge">{estadoPersistente.especialidade}</span>}
      </div>

      <div className="fila-board">
        {PRIORIDADES.map((prio) => (
          <Coluna key={prio} prioridade={prio} itens={itens.filter((f) => f.prioridade === prio)}
            usuario={u}
            onMover={alterarPrioridade} onVer={(id) => navigate('/paciente/' + id)}
            onAgendar={abrirAgendamento} onDesagendar={desagendarItem} onRemover={removerDaFila} />
        ))}
      </div>
    </div>
  );
}

function VazioRestrito({ onVoltar }: { onVoltar: () => void }) {
  return (
    <div className="empty">
      <div className="e-icon"><Icon nome="cadeado" tamanho={22} /></div>
      <h3>Tela restrita</h3>
      <p>Seu perfil não tem acesso às filas de atendimento.</p>
      <div className="u-mt-3"><button className="btn btn-secondary" onClick={onVoltar}>Voltar</button></div>
    </div>
  );
}

function Coluna({ prioridade, itens, usuario, onMover, onVer, onAgendar, onDesagendar, onRemover }: {
  prioridade: Prioridade; itens: FilaItem[]; usuario: Usuario;
  onMover: (id: string, p: Prioridade) => void; onVer: (id: string) => void;
  onAgendar: (id: string) => void; onDesagendar: (id: string) => void; onRemover: (id: string) => void;
}) {
  const ordenados = U.ordenarPor(itens, (f) => f.dataEntrada);
  const [arrastandoSobre, setArrastandoSobre] = useState(false);

  return (
    <section className={'fila-col ' + CLASSES[prioridade] + (arrastandoSobre ? ' is-dragover' : '')} aria-label={'Fila ' + prioridade}
      onDragOver={(e) => { if (pode(usuario, 'priorizar_fila')) { e.preventDefault(); setArrastandoSobre(true); } }}
      onDragLeave={() => setArrastandoSobre(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastandoSobre(false);
        const id = e.dataTransfer.getData('text/plain');
        if (id) onMover(id, prioridade);
      }}>
      <div className="fila-col-head">
        <div className="fc-title"><span className="fc-name">{prioridade}</span><span className="fc-count">{itens.length}</span></div>
        <div className="fc-meta">{itens.length ? 'espera média de ' + esperaMedia(itens) + ' dias' : 'nenhuma pessoa nesta faixa'}</div>
      </div>
      <div className="fila-col-body">
        {ordenados.length ? ordenados.map((f) => (
          <Cartao key={f.id} f={f} usuario={usuario} onMover={onMover} onVer={onVer} onAgendar={onAgendar} onDesagendar={onDesagendar} onRemover={onRemover} />
        )) : <div className="u-xs u-faint u-center" style={{ padding: 'var(--sp-5) 0' }}>Vazio</div>}
      </div>
    </section>
  );
}

function Cartao({ f, usuario, onMover, onVer, onAgendar, onDesagendar, onRemover }: {
  f: FilaItem; usuario: Usuario;
  onMover: (id: string, p: Prioridade) => void; onVer: (id: string) => void;
  onAgendar: (id: string) => void; onDesagendar: (id: string) => void; onRemover: (id: string) => void;
}) {
  const data = useData();
  const p = data.paciente(f.pacienteId);
  const arrastandoRef = useRef(false);
  if (!p) return null;

  const espera = U.diffDias(f.dataEntrada);
  const outras = data.filasDoPaciente(p.id).filter((x) => x.id !== f.id && x.especialidade === f.especialidade);

  const podeGerenciar = podeGerenciarFila(usuario, f);
  const podeAgendarAqui = podeAgendarNestaFila(usuario, f);
  const podeArrastar = podeGerenciar;

  return (
    <article className={'fila-card ' + CLASSES[f.prioridade] + (arrastandoRef.current ? ' is-dragging' : '')}
      draggable={podeArrastar} style={podeArrastar ? undefined : { cursor: 'default' }}
      onDragStart={(e) => { if (!podeArrastar) return; e.dataTransfer.setData('text/plain', f.id); e.dataTransfer.effectAllowed = 'move'; }}>
      <div className="fk-top">
        <div className="u-grow" style={{ minWidth: 0 }}>
          <div className="fk-name">{p.nomeCompleto}</div>
          <div className="fk-sub">{U.idadeTexto(p.dataNascimento)} · {f.especialidade}</div>
        </div>
        {podeGerenciar || podeAgendarAqui ? (
          <Dropdown rotuloAcessivel="Ações da fila" itens={
            <>
              {podeGerenciar ? (
                <>
                  <div className="dd-head">Alterar prioridade</div>
                  {PRIORIDADES.map((pr) => (
                    <button key={pr} disabled={pr === f.prioridade} onClick={() => onMover(f.id, pr)}>
                      <span className={'dot ' + CLASSES[pr]} style={{ background: 'var(--prio-fg)' }} /> {pr}{pr === f.prioridade ? ' (atual)' : ''}
                    </button>
                  ))}
                  <div className="dd-sep" />
                </>
              ) : null}
              {podeAgendarAqui ? (
                <>
                  <button onClick={() => onAgendar(f.id)}><Icon nome="calendario" tamanho={15} /> {f.status === 'agendado' ? 'Reagendar' : 'Agendar atendimento'}</button>
                  {f.status === 'agendado' ? <button onClick={() => onDesagendar(f.id)}><Icon nome="x" tamanho={15} /> Desfazer agendamento</button> : null}
                </>
              ) : null}
              <button onClick={() => onVer(p.id)}><Icon nome="prontuario" tamanho={15} /> Abrir prontuário</button>
              {podeGerenciar ? <button onClick={() => onRemover(f.id)}><Icon nome="x" tamanho={15} /> Remover da fila</button> : null}
            </>
          } />
        ) : null}
      </div>

      <div className="fk-tags">
        {f.status === 'agendado' && f.dataAgendada ? (
          <span className="badge badge-ok"><Icon nome="calendario" tamanho={11} /> {U.fmtDataCurta(f.dataAgendada)}{f.horarioAgendado ? ' · ' + f.horarioAgendado : ''}</span>
        ) : null}
        <span className="badge badge-muted"><Icon nome="relogio" tamanho={11} /> {espera} dias</span>
        <span className="badge badge-muted">{f.posicao || '—'}º da fila</span>
        {f.origem === 'encaminhamento' ? <span className="badge"><Icon nome="encaminhar" tamanho={11} /> encaminhado</span> : null}
        {f.origem === 'escola' ? <span className="badge badge-muted"><Icon nome="escola" tamanho={11} /> escola</span> : null}
        {outras.length ? <span className="badge badge-warn" title="Mesma especialidade em outro serviço">⚠ também no {data.siglaServico(outras[0].servicoId)}</span> : null}
      </div>

      <div className="fk-actions">
        {pode(usuario, 'registrar_atendimento') ? (
          <a className="btn btn-sm btn-primary" href={'#/atendimento/novo?paciente=' + p.id + '&fila=' + f.id}>Chamar para atendimento</a>
        ) : (
          <a className="btn btn-sm btn-secondary" href={'#/paciente/' + p.id}>Ver prontuário</a>
        )}
      </div>
    </article>
  );
}
