/* SARES — Inicialização do Firebase.
   Duas instâncias de app: a principal (auth/db normais) e uma "secundária",
   usada só para criar contas novas (Configurações → gerenciar usuários) sem
   deslogar quem está criando — createUserWithEmailAndPassword troca a
   sessão ativa da instância em que roda, então rodamos numa instância
   descartável e nunca chamamos signOut nela de propósito (ela nunca fica
   "logada" para o resto do app). */
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);

/* Cache local em IndexedDB (várias abas): reabrir o app no mesmo navegador
   reaproveita o que já foi baixado e só sincroniza o que mudou, em vez de
   reler as coleções inteiras a cada carregamento — é o que evita bater no
   teto de leituras do plano gratuito em um dia de uso normal.
   `initializeFirestore` só pode rodar uma vez por app; em recarregamento a
   quente (Vite HMR) este módulo pode reexecutar, então cai para
   `getFirestore` (idempotente) se já tiver sido inicializado antes. */
let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch {
  dbInstance = getFirestore(app);
}
export const db: Firestore = dbInstance;

let secondaryApp: FirebaseApp | null = null;
export function getSecondaryAuth(): Auth {
  if (!secondaryApp) {
    secondaryApp = initializeApp(firebaseConfig, 'secondary-' + Date.now());
  }
  return getAuth(secondaryApp);
}
