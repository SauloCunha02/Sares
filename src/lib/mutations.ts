/* SARES — Camada de escrita. Porte das mutações de js/data/store.js para o
   Firestore. Cada função recebe o estado atual (de useData()) que precisar
   consultar — não há um `db.state` global aqui, então o que antes era
   `db.state.filas.forEach(...)` vira um parâmetro `filas: FilaItem[]`. */
import { useMemo } from 'react';
import { doc, collection, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { U } from './utils';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';
import * as audit from './audit';
import { varrerBase, LIMITE_ALERTA } from './dedup';
import { gerar as gerarSeed } from './seed';
import type {
  Usuario, Paciente, FilaItem, Atendimento, Anamnese, Alerta, Prioridade
} from './types';

async function apagarTodosDocumentos(nomeColecao: string, ids: string[]) {
  const CHUNK = 400;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const batch = writeBatch(db);
    ids.slice(i, i + CHUNK).forEach((id) => batch.delete(doc(db, nomeColecao, id)));
    await batch.commit();
  }
}

async function escreverTodosDocumentos<T extends { id: string }>(nomeColecao: string, itens: T[]) {
  const CHUNK = 400;
  for (let i = 0; i < itens.length; i += CHUNK) {
    const batch = writeBatch(db);
    itens.slice(i, i + CHUNK).forEach((item) => {
      const { id, ...resto } = item;
      batch.set(doc(db, nomeColecao, id), resto);
    });
    await batch.commit();
  }
}

const PESO_PRIORIDADE: Record<Prioridade, number> = { 'URGENTE': 0, 'CURTO PRAZO': 1, 'LISTA DE ESPERA': 2 };

export function useMutations() {
  const data = useData();
  const { usuario } = useAuth();

  return useMemo(() => {
    const { filas, pacientesTodos, atendimentos, anamneses, alertas, siglaServico } = data;

    /* ---------- Usuários ---------- */
    type DadosNovoUsuario = Pick<Usuario, 'nome' | 'perfil' | 'servicoId' | 'email'> &
      Partial<Pick<Usuario, 'especialidade' | 'conselho' | 'avatarCor' | 'senha' | 'ativo'>>;

    async function criarUsuario(dados: DadosNovoUsuario) {
      const ref = doc(collection(db, 'usuarios'));
      const novo: Omit<Usuario, 'id'> = {
        especialidade: null, conselho: null, avatarCor: null, ativo: true,
        senha: 'sares123', ...dados
      };
      const batch = writeBatch(db);
      batch.set(ref, novo);
      await batch.commit();
      await audit.log(usuario, 'criou_usuario', 'usuario', ref.id, null, novo.nome + ' — ' + novo.perfil);
      return { id: ref.id, ...novo };
    }

    async function atualizarUsuario(id: string, campos: Partial<Usuario>) {
      const batch = writeBatch(db);
      batch.update(doc(db, 'usuarios', id), campos);
      await batch.commit();
      await audit.log(usuario, 'editou_usuario', 'usuario', id, null, '');
    }

    /* Liga uma conta de Firebase Auth recém-criada ao documento em
       `usuarios` — sem isso, a pessoa consegue logar (Auth aceita a
       conta), mas as regras do Firestore recusam qualquer leitura/escrita
       protegida (ver firestore.rules: autorizado() exige authUsers/{uid}). */
    async function provisionarAuthUser(authUid: string, usuarioId: string) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'authUsers', authUid), { usuarioId });
      await batch.commit();
    }

    /* ---------- Pacientes ---------- */
    type DadosNovoPaciente = Omit<Paciente,
      'id' | 'criadoEm' | 'atualizadoEm' | 'statusRegistro' | 'nomeSocial' | 'cpf' | 'nomePai' | 'medicacoes' | 'numeroProntuario' | 'dataAbertura'
    > & Partial<Pick<Paciente, 'nomeSocial' | 'cpf' | 'nomePai' | 'medicacoes' | 'numeroProntuario' | 'dataAbertura'>>;

    async function criarPaciente(dados: DadosNovoPaciente) {
      const ref = doc(collection(db, 'pacientes'));
      const novo: Omit<Paciente, 'id'> = {
        nomeSocial: '', cpf: '', nomePai: '', medicacoes: [],
        numeroProntuario: String(U.intBetween(Math.random, 10000, 99999)), dataAbertura: U.hojeISO(),
        ...dados,
        criadoEm: Date.now(), atualizadoEm: Date.now(), statusRegistro: 'ativo'
      };
      const batch = writeBatch(db);
      batch.set(ref, novo);
      await batch.commit();
      await audit.log(usuario, 'criou_paciente', 'paciente', ref.id, ref.id, 'Cadastro inicial');
      return { id: ref.id, ...novo };
    }

    async function atualizarPaciente(id: string, campos: Partial<Paciente>) {
      const batch = writeBatch(db);
      batch.update(doc(db, 'pacientes', id), { ...campos, atualizadoEm: Date.now() });
      await batch.commit();
      await audit.log(usuario, 'editou_paciente', 'paciente', id, id, '');
    }

    /* Une vínculos repetidos de serviço+especialidade num só, para o MESMO
       paciente — mantém a entrada mais antiga e a prioridade mais alta.
       Devolve os IDs encerrados (para o chamador também aplicar no seu
       array local, já que o batch ainda não propagou via snapshot). */
    async function consolidarFilasDuplicadas(pacienteId: string, filasAtuais: FilaItem[]) {
      const ativas = filasAtuais.filter((f) => f.pacienteId === pacienteId && (f.status === 'aguardando' || f.status === 'agendado'));
      const grupos = U.agruparPor(ativas, (f) => f.servicoId + '|' + f.especialidade);
      const encerradas: FilaItem[] = [];
      const batch = writeBatch(db);
      let houveEscrita = false;

      Object.keys(grupos).forEach((k) => {
        const itens = grupos[k];
        if (itens.length < 2) return;
        const mantida = U.ordenarPor(itens, (f) => f.dataEntrada)[0];
        const camposMantida: Partial<FilaItem> = {};

        itens.forEach((f) => {
          if (f === mantida) return;
          if (PESO_PRIORIDADE[f.prioridade] < PESO_PRIORIDADE[camposMantida.prioridade || mantida.prioridade]) {
            camposMantida.prioridade = f.prioridade;
          }
          if (f.dataAgendada && !mantida.dataAgendada) {
            camposMantida.dataAgendada = f.dataAgendada;
            camposMantida.status = 'agendado';
          }
          batch.update(doc(db, 'filas', f.id), {
            status: 'consolidado',
            observacao: 'Vínculo unificado na mesclagem de cadastros duplicados.'
          });
          houveEscrita = true;
          encerradas.push(f);
        });

        if (Object.keys(camposMantida).length) {
          batch.update(doc(db, 'filas', mantida.id), camposMantida);
          houveEscrita = true;
        }
      });

      if (houveEscrita) await batch.commit();
      if (encerradas.length) await recalcularPosicoes(filasAtuais);
      return encerradas;
    }

    /* Mescla B em A: A permanece ativo, B vira 'mesclado' e todo o histórico migra. */
    async function mesclarPacientes(idPrincipal: string, idSecundario: string, valoresEscolhidos?: Partial<Paciente>) {
      const a = pacientesTodos.find((p) => p.id === idPrincipal);
      const b = pacientesTodos.find((p) => p.id === idSecundario);
      if (!a || !b) return null;

      /* logs não é mais carregado globalmente (ver DataContext.tsx) — busca
         só os do paciente que está sendo mesclado, uma vez. */
      const logsDoB = await getDocs(query(collection(db, 'logs'), where('pacienteId', '==', b.id)));

      const batch = writeBatch(db);
      atendimentos.forEach((at) => { if (at.pacienteId === b.id) batch.update(doc(db, 'atendimentos', at.id), { pacienteId: a.id }); });
      const filasDoB = filas.filter((f) => f.pacienteId === b.id);
      filasDoB.forEach((f) => batch.update(doc(db, 'filas', f.id), { pacienteId: a.id }));
      logsDoB.forEach((l) => batch.update(doc(db, 'logs', l.id), { pacienteId: a.id }));
      anamneses.forEach((an) => { if (an.pacienteId === b.id) batch.update(doc(db, 'anamneses', an.id), { pacienteId: a.id }); });

      batch.update(doc(db, 'pacientes', b.id), { statusRegistro: 'mesclado', mescladoEm: a.id });
      batch.update(doc(db, 'pacientes', a.id), {
        ...(valoresEscolhidos || {}),
        atualizadoEm: Date.now(),
        prontuariosMesclados: (a.prontuariosMesclados || []).concat([b.numeroProntuario])
      });
      await batch.commit();

      // Reflete localmente a reatribuição de pacienteId antes de consolidar (o snapshot ainda não chegou)
      const filasReatribuidas = filas.map((f) => (f.pacienteId === b.id ? { ...f, pacienteId: a.id } : f));
      const consolidadas = await consolidarFilasDuplicadas(a.id, filasReatribuidas);

      await audit.log(usuario, 'mesclou_cadastros', 'paciente', a.id, a.id,
        'Mesclado com prontuário ' + b.numeroProntuario);

      return { pacienteId: a.id, filasConsolidadas: consolidadas };
    }

    /* ---------- Filas ---------- */
    async function recalcularPosicoes(filasAtuais: FilaItem[]) {
      const grupos = U.agruparPor(
        filasAtuais.filter((f) => f.status === 'aguardando' || f.status === 'agendado'),
        (f) => f.servicoId + '|' + f.prioridade
      );
      const batch = writeBatch(db);
      let houveEscrita = false;
      Object.keys(grupos).forEach((k) => {
        U.ordenarPor(grupos[k], (f) => f.dataEntrada).forEach((f, i) => {
          if (f.posicao !== i + 1) {
            batch.update(doc(db, 'filas', f.id), { posicao: i + 1 });
            houveEscrita = true;
          }
        });
      });
      if (houveEscrita) await batch.commit();
    }

    async function inserirNaFila(dados: Pick<FilaItem, 'pacienteId' | 'servicoId' | 'especialidade' | 'prioridade'> & Partial<FilaItem>) {
      const ref = doc(collection(db, 'filas'));
      const novo: Omit<FilaItem, 'id'> = {
        status: 'aguardando', origem: 'espontanea', encaminhamentoOrigemId: null,
        dataEntrada: U.hojeISO(), dataAgendada: null, posicao: 999, observacao: '',
        ...dados
      };
      const batch = writeBatch(db);
      batch.set(ref, novo);
      await batch.commit();
      await recalcularPosicoes([...filas, { id: ref.id, ...novo }]);
      await audit.log(usuario, 'inseriu_fila', 'fila', ref.id, dados.pacienteId, siglaServico(dados.servicoId) + ' — ' + dados.especialidade);
      return { id: ref.id, ...novo };
    }

    async function atualizarFila(id: string, campos: Partial<FilaItem>, acao?: string) {
      const batch = writeBatch(db);
      batch.update(doc(db, 'filas', id), campos);
      await batch.commit();
      const filasAtualizadas = filas.map((f) => (f.id === id ? { ...f, ...campos } : f));
      await recalcularPosicoes(filasAtualizadas);
      if (acao) await audit.log(usuario, acao, 'fila', id, null, '');
    }

    async function agendar(filaId: string, dataISO: string, horario?: string) {
      await atualizarFila(filaId, { dataAgendada: dataISO, horarioAgendado: horario || '', status: 'agendado' }, 'agendou_atendimento');
    }

    async function desagendar(filaId: string) {
      await atualizarFila(filaId, { dataAgendada: null, horarioAgendado: '', status: 'aguardando' });
    }

    /* ---------- Atendimentos ---------- */
    type DadosNovoAtendimento = Pick<Atendimento, 'pacienteId' | 'servicoId' | 'profissionalId' | 'especialidade' | 'data'> &
      Partial<Pick<Atendimento,
        'tipo' | 'horario' | 'numeroSessao' | 'presenca' | 'motivoAusencia' | 'objetivoSessao' | 'evolucao' | 'condutas' | 'filaItemId' | 'encaminhamentos'
      >>;

    async function registrarAtendimento(dados: DadosNovoAtendimento) {
      const atRef = doc(collection(db, 'atendimentos'));
      const at: Omit<Atendimento, 'id'> = {
        tipo: 'sessao', horario: '', numeroSessao: 1, presenca: 'compareceu', motivoAusencia: '',
        objetivoSessao: '', evolucao: '', condutas: '', encaminhamentos: [], registradoEm: Date.now(),
        ...dados
      };

      const batch = writeBatch(db);
      batch.set(atRef, at);

      const filasCriadas: FilaItem[] = [];
      (at.encaminhamentos || []).forEach((e) => {
        const filaRef = doc(collection(db, 'filas'));
        const nova: Omit<FilaItem, 'id'> = {
          pacienteId: at.pacienteId, servicoId: e.servicoId, especialidade: e.especialidade,
          prioridade: e.prioridade || 'LISTA DE ESPERA', status: 'aguardando', origem: 'encaminhamento',
          encaminhamentoOrigemId: atRef.id, dataEntrada: at.data, dataAgendada: null, posicao: 999,
          observacao: e.motivo || ''
        };
        batch.set(filaRef, nova);
        filasCriadas.push({ id: filaRef.id, ...nova });
      });

      if (at.filaItemId) {
        batch.update(doc(db, 'filas', at.filaItemId), { status: at.presenca === 'compareceu' ? 'concluido' : 'aguardando' });
      }

      await batch.commit();

      const filasAtualizadas = [...filas, ...filasCriadas].map((f) =>
        (at.filaItemId && f.id === at.filaItemId) ? { ...f, status: at.presenca === 'compareceu' ? 'concluido' as const : 'aguardando' as const } : f
      );
      await recalcularPosicoes(filasAtualizadas);
      await detectarSobreposicoes(filasAtualizadas, alertas);
      await audit.log(usuario, 'registrou_atendimento', 'atendimento', atRef.id, at.pacienteId, at.especialidade + ' — ' + at.presenca);
      if (at.encaminhamentos && at.encaminhamentos.length) {
        await audit.log(usuario, 'encaminhou', 'atendimento', atRef.id, at.pacienteId,
          at.encaminhamentos.map((e) => siglaServico(e.servicoId) + ' — ' + e.especialidade).join(', '));
      }

      return { atendimento: { id: atRef.id, ...at }, filasCriadas };
    }

    /* ---------- Anamneses ---------- */
    type DadosNovaAnamnese = Pick<Anamnese, 'pacienteId' | 'tipo' | 'servicoId' | 'profissionalId' | 'respostas'> & Partial<Pick<Anamnese, 'data'>>;

    async function salvarAnamnese(dados: DadosNovaAnamnese) {
      const existente = anamneses.find((a) => a.pacienteId === dados.pacienteId && a.tipo === dados.tipo && a.servicoId === dados.servicoId);
      if (existente) {
        await writeBatch(db).update(doc(db, 'anamneses', existente.id), { ...dados, atualizadoEm: Date.now() }).commit();
        await audit.log(usuario, 'registrou_anamnese', 'anamnese', existente.id, dados.pacienteId, dados.tipo);
        return { ...existente, ...dados, atualizadoEm: Date.now() };
      }
      const ref = doc(collection(db, 'anamneses'));
      const nova: Omit<Anamnese, 'id'> = { data: U.hojeISO(), criadoEm: Date.now(), atualizadoEm: Date.now(), ...dados };
      await writeBatch(db).set(ref, nova).commit();
      await audit.log(usuario, 'registrou_anamnese', 'anamnese', ref.id, dados.pacienteId, dados.tipo);
      return { id: ref.id, ...nova };
    }

    /* ---------- Alertas de duplicidade ---------- */
    type DadosNovoAlerta = Pick<Alerta, 'pacienteIds' | 'score' | 'criterios'> & Partial<Pick<Alerta, 'tipo' | 'filaIds'>>;

    async function criarAlerta(dados: DadosNovoAlerta) {
      const ref = doc(collection(db, 'alertas'));
      const novo: Omit<Alerta, 'id'> = {
        tipo: 'cadastro', status: 'aberto', detectadoEm: Date.now(),
        resolvidoPor: null, resolvidoEm: null, observacao: '', ...dados
      };
      await writeBatch(db).set(ref, novo).commit();
      return { id: ref.id, ...novo };
    }

    async function resolverAlerta(id: string, status: Alerta['status'], observacao?: string) {
      await writeBatch(db).update(doc(db, 'alertas', id), {
        status, resolvidoPor: usuario?.id || null, resolvidoEm: Date.now(), observacao: observacao || ''
      }).commit();
      await audit.log(usuario, status === 'mesclado' ? 'mesclou_cadastros' : 'descartou_alerta', 'alerta', id, null, '');
    }

    /* Varre as filas ativas em busca da mesma especialidade em serviços distintos. */
    async function detectarSobreposicoes(filasAtuais: FilaItem[], alertasAtuais: Alerta[]) {
      const ativos = filasAtuais.filter((f) => f.status === 'aguardando' || f.status === 'agendado');
      const grupos = U.agruparPor(ativos, (f) => f.pacienteId + '|' + f.especialidade);
      const batch = writeBatch(db);
      let novos = 0;

      Object.keys(grupos).forEach((k) => {
        const itens = grupos[k];
        const servicos: Record<string, boolean> = {};
        itens.forEach((i) => { servicos[i.servicoId] = true; });
        if (Object.keys(servicos).length < 2) return;

        const pacienteId = itens[0].pacienteId;
        const esp = itens[0].especialidade;

        const jaExiste = alertasAtuais.some((a) =>
          a.tipo === 'atendimento' && a.status === 'aberto' && a.pacienteIds[0] === pacienteId &&
          (a.criterios[0] || '').indexOf(esp) >= 0
        );
        if (jaExiste) return;

        const ref = doc(collection(db, 'alertas'));
        batch.set(ref, {
          tipo: 'atendimento', pacienteIds: [pacienteId], score: 100,
          criterios: [
            'Mesma especialidade (' + esp + ')',
            'Serviços simultâneos: ' + Object.keys(servicos).map(siglaServico).join(' e ')
          ],
          status: 'aberto', detectadoEm: Date.now(), resolvidoPor: null, resolvidoEm: null, observacao: '',
          filaIds: itens.map((i) => i.id)
        });
        novos++;
      });

      if (novos) await batch.commit();
      return novos;
    }

    /* Varre a base inteira em busca de cadastros duplicados ainda sem
       alerta — botão "Varrer base agora" em Duplicidades. */
    async function sincronizarAlertasCadastro() {
      const existentes: Record<string, boolean> = {};
      alertas.forEach((a) => {
        if (a.tipo !== 'cadastro') return;
        existentes[[...a.pacienteIds].sort().join('|')] = true;
      });

      const achados = varrerBase(pacientesTodos.filter((p) => p.statusRegistro !== 'mesclado'));
      const batch = writeBatch(db);
      let novos = 0;

      achados.forEach((d) => {
        if (d.score < LIMITE_ALERTA) return;
        const chave = [d.a.id, d.b.id].sort().join('|');
        if (existentes[chave]) return;
        existentes[chave] = true;
        const ref = doc(collection(db, 'alertas'));
        batch.set(ref, {
          tipo: 'cadastro', pacienteIds: [d.a.id, d.b.id], score: d.score, criterios: d.criterios,
          status: 'aberto', detectadoEm: Date.now(), resolvidoPor: null, resolvidoEm: null, observacao: ''
        });
        novos++;
      });

      if (novos) await batch.commit();
      return novos;
    }

    /* ---------- Ferramentas de administração (gestão) ----------
       Restrito na UI a quem tem ver_configuracoes (só gestor); os dois
       dependem de reescrever coleções inteiras, então checam de novo aqui
       como defesa em profundidade. */

    /* Apaga pacientes/filas/atendimentos/anamneses/alertas/logs e regrava a
       mesma seed determinística (seed 20260916) usada em scripts/seed.ts —
       a base volta ao estado original. usuarios/servicos não são tocados:
       têm conta de Firebase Auth de verdade atrelada (authUid). */
    async function reiniciarDados() {
      if (usuario?.perfil !== 'gestor') return;

      await apagarTodosDocumentos('pacientes', pacientesTodos.map((p) => p.id));
      await apagarTodosDocumentos('filas', filas.map((f) => f.id));
      await apagarTodosDocumentos('atendimentos', atendimentos.map((a) => a.id));
      await apagarTodosDocumentos('anamneses', anamneses.map((a) => a.id));
      await apagarTodosDocumentos('alertas', alertas.map((a) => a.id));
      // logs não é carregado globalmente — busca os ids só aqui, uma vez.
      const logsAtuais = await getDocs(collection(db, 'logs'));
      await apagarTodosDocumentos('logs', logsAtuais.docs.map((d) => d.id));

      const fresca = gerarSeed();
      await escreverTodosDocumentos('pacientes', fresca.pacientes);
      await escreverTodosDocumentos('filas', fresca.filas);
      await escreverTodosDocumentos('atendimentos', fresca.atendimentos);
      await escreverTodosDocumentos('anamneses', fresca.anamneses);
      await escreverTodosDocumentos('alertas', fresca.alertas);
      await escreverTodosDocumentos('logs', fresca.logs);

      await audit.log(usuario, 'editou_paciente', 'sistema', null, null, 'Base de dados reiniciada para o estado original da seed');
    }

    /* Recua atendimentos/filas/pacientes em 30 dias — simula "o mês
       seguinte chegou" para mostrar a evolução dos indicadores. */
    async function avancarTempo30Dias() {
      if (usuario?.perfil !== 'gestor') return;

      const DIAS = -30;
      let batch = writeBatch(db);
      let ops = 0;
      const commitSeNecessario = async () => {
        ops++;
        if (ops >= 400) { await batch.commit(); batch = writeBatch(db); ops = 0; }
      };

      for (const a of atendimentos) {
        batch.update(doc(db, 'atendimentos', a.id), { data: U.addDias(a.data, DIAS) });
        await commitSeNecessario();
      }
      for (const f of filas) {
        const campos: Partial<FilaItem> = { dataEntrada: U.addDias(f.dataEntrada, DIAS) };
        if (f.dataAgendada) campos.dataAgendada = U.addDias(f.dataAgendada, DIAS);
        batch.update(doc(db, 'filas', f.id), campos);
        await commitSeNecessario();
      }
      for (const p of pacientesTodos) {
        batch.update(doc(db, 'pacientes', p.id), { dataAbertura: U.addDias(p.dataAbertura, DIAS) });
        await commitSeNecessario();
      }
      if (ops > 0) await batch.commit();

      await audit.log(usuario, 'editou_paciente', 'sistema', null, null, 'Datas da base avançadas em 30 dias');
    }

    return {
      criarUsuario, atualizarUsuario, provisionarAuthUser,
      criarPaciente, atualizarPaciente, mesclarPacientes,
      inserirNaFila, atualizarFila, agendar, desagendar,
      registrarAtendimento, salvarAnamnese,
      criarAlerta, resolverAlerta,
      detectarSobreposicoes: () => detectarSobreposicoes(filas, alertas),
      sincronizarAlertasCadastro,
      reiniciarDados, avancarTempo30Dias
    };
  }, [data, usuario]);
}
