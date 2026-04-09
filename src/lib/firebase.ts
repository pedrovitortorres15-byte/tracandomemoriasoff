import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyClgE6-56MH1h6IUTp3gv4zVhmqNkmSnPA",
  authDomain: "tracando-fcbc5.firebaseapp.com",
  projectId: "tracando-fcbc5",
  storageBucket: "tracando-fcbc5.firebasestorage.app",
  messagingSenderId: "63445625910",
  appId: "1:63445625910:web:688e0165cdeb3266cafc97",
  measurementId: "G-DQ2Q045PGT",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export interface FirebaseProduct {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  imagem?: string;
  imagens?: string[];
  categoria?: string;
  ativo?: boolean;
  estoque?: number;
  // flexible fields from the admin panel
  [key: string]: unknown;
}

export async function fetchProducts(): Promise<FirebaseProduct[]> {
  // Try common collection names
  const collectionNames = ["produtos", "products"];
  
  for (const name of collectionNames) {
    try {
      const snapshot = await getDocs(collection(db, name));
      if (!snapshot.empty) {
        return snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as FirebaseProduct[];
      }
    } catch (e) {
      console.warn(`Collection "${name}" not found or error:`, e);
    }
  }
  
  return [];
}

export async function fetchProductById(id: string): Promise<FirebaseProduct | null> {
  const collectionNames = ["produtos", "products"];
  
  for (const name of collectionNames) {
    try {
      const docRef = doc(db, name, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as FirebaseProduct;
      }
    } catch (e) {
      console.warn(`Error fetching doc from "${name}":`, e);
    }
  }
  
  return null;
}
