/* Correção emergencial: cria a coleção `authUsers/{authUid} -> {usuarioId}`
   para as contas já semeadas, sem precisar recriar nada. As regras do
   Firestore passam a exigir essa coleção para provar que a conta logada é
   uma das provisionadas pela rede — não basta mais só estar autenticado
   (self-signup com a mesma API key pública era o buraco). Rodar UMA vez,
   antes de publicar firestore.rules com a checagem `autorizado()`. */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import 'dotenv/config';
import { USUARIOS, SENHA_DEMO } from '../src/lib/seed';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  await signInWithEmailAndPassword(auth, USUARIOS[0].email, SENHA_DEMO);
  console.log('Autenticado como', USUARIOS[0].email);

  const snap = await getDocs(collection(db, 'usuarios'));
  const batch = writeBatch(db);
  let n = 0;
  snap.docs.forEach((d) => {
    const authUid = (d.data() as { authUid?: string }).authUid;
    if (!authUid) { console.warn('  sem authUid:', d.id); return; }
    batch.set(doc(db, 'authUsers', authUid), { usuarioId: d.id });
    n++;
  });
  await batch.commit();
  console.log('authUsers gravados:', n);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
