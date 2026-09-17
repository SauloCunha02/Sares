/* SARES — Anamnese. Porte de js/screens/anamnese.js.
   O formulário é montado a partir de SARES.instrumentos — esta tela não
   conhece nenhum campo pelo nome, só percorre o catálogo. */
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Campo, Selecao, AreaTexto, Vazio, Alerta, ItemDado, ChipServico } from '../components/ui';
import { useAuth } from '../lib/AuthContext';
import { useData } from '../lib/DataContext';
import { useMutations } from '../lib/mutations';
import { useTopbar } from '../lib/TopbarContext';
import { pode } from '../lib/permissions';
import { instrumentos, type CampoInstrumento } from '../lib/instrumentos';
import type { TipoAnamnese } from '../lib/types';
import { U } from '../lib/utils';
import { ok as toastOk, aviso as toastAviso } from '../lib/toast';

export default function Anamnese() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const data = useData();
  const mut = useMutations();

  const p = data.paciente(id);
  const tipo = (params.get('tipo') || (usuario?.especialidade ? instrumentos.paraEspecialidade(usuario.especialidade)?.id : null) || 'psicologica') as TipoAnamnese;
  const inst = instrumentos.obter(tipo);

  const existente = p ? data.anamnesesDoPaciente(p.id).find((a) => a.tipo === tipo && a.servicoId === usuario?.servicoId) : undefined;

  const [respostas, setRespostas] = useState<Record<string, unknown>>({});
  const [erros, setErros] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (existente) setRespostas(existente.respostas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existente?.id]);

  useTopbar(inst ? inst.rotulo : 'Anamnese', p ? p.nomeCompleto + ' · ficha ' + (inst?.ficha || '') + ' do anexo' : undefined);

  if (!usuario) return null;

  if (!pode(usuario, 'registrar_anamnese')) {
    return <div className="view-narrow">
      <Vazio icone="cadeado" titulo="Você não pode registrar anamneses" texto="Esta ação é permitida aos perfis de profissional e coordenação."
        acao={<a className="btn btn-secondary" href="#/pacientes" onClick={(e) => { e.preventDefault(); navigate('/pacientes'); }}>Voltar</a>} />
    </div>;
  }

  if (!p) { navigate('/pacientes', { replace: true }); return null; }
  if (!inst) { navigate('/paciente/' + p.id + '?aba=anamneses', { replace: true }); return null; }

  const u = usuario;
  const paciente = p;
  const instrumento = inst;

  function set(nome: string, v: unknown) { setRespostas((r) => ({ ...r, [nome]: v })); }

  async function salvar() {
    const faltando: string[] = [];
    const novosErros: Record<string, boolean> = {};
    instrumentos.campos(tipo).forEach((c) => {
      if (!c.obrigatorio) return;
      const v = respostas[c.nome];
      const vazio = !String(v || '').trim();
      novosErros[c.nome] = vazio;
      if (vazio) faltando.push(c.rotulo);
    });
    setErros(novosErros);
    if (faltando.length) {
      toastAviso('Campos obrigatórios', 'Preencha: ' + faltando.join(', ') + '.');
      return;
    }

    setSalvando(true);
    try {
      await mut.salvarAnamnese({
        pacienteId: paciente.id, tipo, servicoId: u.servicoId!, profissionalId: u.id,
        data: U.hojeISO(), respostas
      });

      const consequencias = ['Disponível a toda a equipe do ' + data.siglaServico(u.servicoId) + ' — ninguém precisa repetir a anamnese com a família'];

      const prioridade = respostas.necessidadeAcompanhamento as string | undefined;
      if (prioridade) {
        const filas = data.filasDoPaciente(paciente.id).filter((f) => f.servicoId === u.servicoId);
        for (const f of filas) {
          if (f.prioridade === prioridade) continue;
          await mut.atualizarFila(f.id, { prioridade: prioridade as never }, 'alterou_prioridade');
          consequencias.push('Fila do ' + data.siglaServico(f.servicoId) + ' — ' + f.especialidade + ' repriorizada para ' + prioridade);
        }
      }

      toastOk('Anamnese registrada', paciente.nomeCompleto + ' · ' + instrumento.rotulo, consequencias);
      navigate('/paciente/' + paciente.id + '?aba=anamneses');
    } finally {
      setSalvando(false);
    }
  }

  const e = p.endereco || ({} as typeof p.endereco);

  return (
    <div className="view-narrow">
      <div className="page-head">
        <div className="ph-title"><h1>{inst.rotulo}</h1><p>{inst.resumo}</p></div>
      </div>

      {existente ? (
        <div className="u-mb-4">
          <Alerta tom="info" titulo="Revisando uma anamnese já registrada"
            texto={'Preenchida em ' + U.fmtData(existente.data) + ' por ' + data.nomeUsuario(existente.profissionalId) + '. Salvar substitui a versão anterior.'} />
        </div>
      ) : null}

      <div className="card u-mb-4">
        <div className="card-head">
          <div><h3>Identificação</h3><p className="u-xs u-muted u-mt-2">Vem do cadastro único da rede — não é digitada de novo em cada ficha.</p></div>
          <span className="badge badge-ok">preenchida pelo sistema</span>
        </div>
        <div className="card-body"><div className="data-grid">
          <ItemDado rotulo="Nome completo" valor={p.nomeCompleto} />
          <ItemDado rotulo="Data de nascimento" valor={U.fmtData(p.dataNascimento) + ' · ' + U.idadeTexto(p.dataNascimento)} />
          <ItemDado rotulo="Naturalidade" valor={p.naturalidade} />
          <ItemDado rotulo="Nome da mãe" valor={p.nomeMae} />
          <ItemDado rotulo="Nome do pai" valor={p.nomePai} />
          <ItemDado rotulo="Responsável" valor={p.responsavel?.nome} />
          <ItemDado rotulo="Telefone" valor={U.fmtTel(p.telefone)} />
          <ItemDado rotulo="Endereço" valor={[e.logradouro, e.numero].filter(Boolean).join(', ') + (e.bairro ? ' — ' + e.bairro : '')} />
          <ItemDado rotulo="Zona" valor={e.zona} />
          <ItemDado rotulo="Escola" valor={p.escola} vazio="sem vínculo escolar" />
          <ItemDado rotulo="Série / turno / turma" valor={[p.serie, p.turno, p.turma].filter(Boolean).join(' · ')} />
          <ItemDado rotulo="Hipótese diagnóstica" valor={p.hipoteseDiagnostica} />
        </div></div>
      </div>

      {inst.mostrarConcomitantes ? <BlocoConcomitantes pacienteId={p.id} /> : null}

      <form onSubmit={(e2) => { e2.preventDefault(); salvar(); }}>
        {inst.secoes.map((s) => (
          <div className="card u-mb-4" key={s.titulo}>
            <div className="card-head"><h3>{s.titulo}</h3></div>
            <div className="card-body"><div className="form-grid">
              {s.campos.map((c) => (
                <CampoAnamnese key={c.nome} campo={c} valor={respostas[c.nome]} erro={erros[c.nome]} onChange={(v) => set(c.nome, v)} />
              ))}
            </div></div>
          </div>
        ))}

        <div className="card"><div className="card-foot u-row u-between u-gap-3 u-wrap" style={{ borderTop: 'none' }}>
          <a className="btn btn-ghost" href={'#/paciente/' + p.id + '?aba=anamneses'} onClick={(e2) => { e2.preventDefault(); navigate('/paciente/' + p.id + '?aba=anamneses'); }}>Cancelar</a>
          <button type="submit" className="btn btn-primary btn-lg" disabled={salvando}>{existente ? 'Salvar revisão' : 'Salvar anamnese'}</button>
        </div></div>
      </form>
    </div>
  );
}

function CampoAnamnese({ campo, valor, erro, onChange }: { campo: CampoInstrumento; valor: unknown; erro?: boolean; onChange: (v: unknown) => void }) {
  if (campo.tipo === 'area') {
    return <div className={erro ? 'campo-invalido' : undefined}>
      <AreaTexto rotulo={campo.rotulo} obrigatorio={campo.obrigatorio} dica={campo.dica} linhas={campo.linhas || 3}
        valor={(valor as string) || ''} onChange={onChange} /></div>;
  }
  if (campo.tipo === 'selecao') {
    return <div className={erro ? 'campo-invalido' : undefined}>
      <Selecao rotulo={campo.rotulo} obrigatorio={campo.obrigatorio} dica={campo.dica} opcoes={campo.opcoes || []}
        valor={(valor as string) || ''} onChange={onChange} /></div>;
  }
  if (campo.tipo === 'multipla') {
    const selecionados = Array.isArray(valor) ? valor as string[] : [];
    return (
      <div className="field span-all">
        <label>{campo.rotulo}</label>
        <div className="opcoes-inline u-mt-2">
          {(campo.opcoes || []).map((o) => (
            <label className="checkline" key={o}>
              <input type="checkbox" checked={selecionados.includes(o)} onChange={(e) => {
                const novo = e.target.checked ? [...selecionados, o] : selecionados.filter((x) => x !== o);
                onChange(novo);
              }} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }
  if (campo.tipo === 'numero') {
    return <div className={erro ? 'campo-invalido' : undefined}>
      <Campo rotulo={campo.rotulo} obrigatorio={campo.obrigatorio} dica={campo.dica} type="number" inputMode="numeric"
        value={(valor as string) || ''} onChange={(e) => onChange(e.target.value)} /></div>;
  }
  return <div className={erro ? 'campo-invalido' : undefined}>
    <Campo rotulo={campo.rotulo} obrigatorio={campo.obrigatorio} dica={campo.dica}
      value={(valor as string) || ''} onChange={(e) => onChange(e.target.value)} /></div>;
}

/* Atendimentos concomitantes (ficha A.4) — na ficha de papel, a educadora
   física preenche isto à mão perguntando à família; aqui é automático. */
function BlocoConcomitantes({ pacienteId }: { pacienteId: string }) {
  const data = useData();
  const filas = data.filasDoPaciente(pacienteId);
  const atendimentos = data.atendimentosDoPaciente(pacienteId);

  interface Linha { servicoId: string; especialidade: string; profissionalId: string | null; data: string | null; situacao: string }
  const mapa: Record<string, Linha> = {};
  atendimentos.forEach((a) => {
    const k = a.servicoId + '|' + a.especialidade;
    if (!mapa[k] || (mapa[k].data || '') < a.data) {
      mapa[k] = { servicoId: a.servicoId, especialidade: a.especialidade, profissionalId: a.profissionalId, data: a.data, situacao: 'em acompanhamento' };
    }
  });
  filas.forEach((f) => {
    const k = f.servicoId + '|' + f.especialidade;
    if (!mapa[k]) {
      mapa[k] = { servicoId: f.servicoId, especialidade: f.especialidade, profissionalId: null, data: f.dataAgendada,
        situacao: f.status === 'agendado' ? 'agendado' : 'aguardando na fila' };
    }
  });

  const linhas = U.ordenarPor(Object.values(mapa), (x) => x.servicoId);

  if (!linhas.length) {
    return <div className="card u-mb-4"><div className="card-body">
      <Vazio icone="mapa" titulo="Nenhum atendimento concomitante" texto="Esta pessoa não é atendida por nenhum outro serviço da rede no momento." />
    </div></div>;
  }

  return (
    <div className="card u-mb-4">
      <div className="card-head">
        <div><h3>Atendimentos concomitantes</h3>
          <p className="u-xs u-muted u-mt-2">Na ficha de papel esta tabela é preenchida perguntando à família. Aqui ela é montada pela própria rede.</p></div>
        <span className="badge badge-ok">{linhas.length} vínculo(s)</span>
      </div>
      <div className="table-wrap"><table className="table"><thead><tr>
        <th>Serviço</th><th>Especialidade</th><th>Profissional</th><th>Situação</th><th>Referência</th>
      </tr></thead><tbody>
        {linhas.map((l) => {
          const sv = data.servico(l.servicoId);
          return (
            <tr key={l.servicoId + l.especialidade}>
              <td><ChipServico sigla={sv?.sigla || '—'} cor={sv?.cor || '#999'} nome={sv?.nome || ''} /></td>
              <td>{l.especialidade}</td>
              <td className="u-sm">{l.profissionalId ? data.nomeUsuario(l.profissionalId) : '—'}</td>
              <td className="u-sm u-muted">{l.situacao}</td>
              <td className="u-sm u-nowrap">{l.data ? U.fmtData(l.data) : '—'}</td>
            </tr>
          );
        })}
      </tbody></table></div>
    </div>
  );
}
