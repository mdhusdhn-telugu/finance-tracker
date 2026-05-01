import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
apiKey: "AIzaSyAqSgNad4QQYCWbR_JEVuplLoGqfMR7WYg",
  authDomain: "financetracker-f65f6.firebaseapp.com",
  projectId: "financetracker-f65f6",
  storageBucket: "financetracker-f65f6.firebasestorage.app",
  messagingSenderId: "789859829378",
  appId: "1:789859829378:web:261d362c460a1a2298569b"};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication and Firestore (Database)
export const auth = getAuth(app);
export const db = getFirestore(app);