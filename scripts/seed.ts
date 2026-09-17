/* Popula o Firestore do projeto configurado em .env com a base de
   demonstração e cria as 19 contas de autenticação da seed.

   Roda com o SDK cliente do Firebase (não o Admin SDK) — de propósito: criar
   cada conta via createUserWithEmailAndPassword já autentica a sessão que
   este script usa, então não precisamos de uma chave de service account
   para escrever no Firestore.

   IMPORTANTE — bootstrap num projeto novo: firestore.rules exige
   autorizado() (autenticado + com doc em authUsers/{uid}), e este script é
   quem cria esses documentos. Num projeto recém-criado ainda não existe
   nenhum, então a primeira escrita (mesmo autenticado) seria recusada.
   Rode assim:
     1. firebase deploy --only firestore:rules com uma regra temporária
        permissiva (allow read, write: if request.auth != null;)
     2. npm run seed
     3. firebase deploy --only firestore:rules de novo, agora com a regra
        real (autorizado()) — o repositório já tem o arquivo certo.

   Como o SDK cliente não deixa escolher o UID da conta criada, o vínculo
   entre a conta de Auth e o documento em `usuarios/{id-da-seed}` (ex.: u-01)
   é feito por um campo `authUid` no próprio documento — é isso que
   `useAuth()` consulta no app (ver src/lib/AuthContext.tsx) para achar o
   perfil de quem acabou de logar. */
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  getFirestore, writeBatch, doc, collection, connectFirestoreEmulator
} from 'firebase/firestore';
import { connectAuthEmulator } from 'firebase/auth';
import 'dotenv/config';

import { gerar, USUARIOS, SENHA_DEMO } from '../src/lib/seed';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const USE_EMULATOR = process.argv.includes('--emulator');

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  if (USE_EMULATOR) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    console.log('Usando emulators locais (Auth :9099, Firestore :8080)');
  }

  console.log('Gerando dados determinísticos (seed 20260916)...');
  const dados = gerar();

  console.log(`Criando ${USUARIOS.length} contas de autenticação...`);
  const authUidPorUsuario: Record<string, string> = {};
  for (const u of USUARIOS) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, u.email, SENHA_DEMO);
      authUidPorUsuario[u.id] = cred.user.uid;
      process.stdout.write('.');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/email-already-in-use') {
        // Já existe (reexecução do script) — entra na conta para pegar o
        // uid dela também, em vez de pular: sem isso authUidPorUsuario
        // fica incompleto e nenhum authUsers é gravado para essa pessoa.
        const cred = await signInWithEmailAndPassword(auth, u.email, SENHA_DEMO);
        authUidPorUsuario[u.id] = cred.user.uid;
        process.stdout.write('.');
      } else {
        throw err;
      }
    }
  }
  console.log('\nContas de autenticação prontas.');

  if (!auth.currentUser) {
    throw new Error('Nenhuma sessão autenticada após criar os usuários — não é possível escrever no Firestore (regras exigem auth != null).');
  }

  async function gravar<T extends { id: string }>(
    colecao: string, itens: T[], transformar?: (semId: Omit<T, 'id'>, id: string) => Record<string, unknown>
  ) {
    const CHUNK = 400;
    for (let i = 0; i < itens.length; i += CHUNK) {
      const batch = writeBatch(db);
      itens.slice(i, i + CHUNK).forEach((item) => {
        const { id, ...resto } = item;
        const dadosFinais = transformar ? transformar(resto, id) : resto;
        batch.set(doc(collection(db, colecao), id), dadosFinais);
      });
      await batch.commit();
    }
    console.log(`  ${colecao}: ${itens.length} documentos`);
  }

  console.log('Gravando coleções no Firestore...');
  await gravar('servicos', dados.servicos);
  await gravar('usuarios', dados.usuarios, (u, id) => {
    const { senha: _senha, ...semSenha } = u;
    return { ...semSenha, authUid: authUidPorUsuario[id] || null };
  });
  await gravar('pacientes', dados.pacientes);
  await gravar('filas', dados.filas);
  await gravar('atendimentos', dados.atendimentos);
  await gravar('anamneses', dados.anamneses);
  await gravar('alertas', dados.alertas);
  await gravar('logs', dados.logs);

  /* authUsers/{authUid} -> {usuarioId} é o que firestore.rules (autorizado())
     exige para liberar leitura/escrita além de usuarios/servicos — sem isso
     as contas criadas acima logariam mas seriam barradas em tudo o mais.
     Precisa rodar com regras permissivas (é o próprio bootstrap: ainda não
     existe nenhum authUsers para autorizar esta escrita) — ver README.md. */
  console.log('Vinculando contas de autenticação (authUsers)...');
  const idsComAuthUid = Object.entries(authUidPorUsuario);
  const CHUNK = 400;
  for (let i = 0; i < idsComAuthUid.length; i += CHUNK) {
    const batch = writeBatch(db);
    idsComAuthUid.slice(i, i + CHUNK).forEach(([usuarioId, uid]) => {
      batch.set(doc(collection(db, 'authUsers'), uid), { usuarioId });
    });
    await batch.commit();
  }
  console.log(`  authUsers: ${idsComAuthUid.length} documentos`);

  console.log('Seed concluída.');
  await signOut(auth);
  process.exit(0);
}

main().catch((err) => {
  console.error('Falha ao popular o Firestore:', err);
  process.exit(1);
});
