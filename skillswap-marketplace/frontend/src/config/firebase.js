import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC1QccpYckLZZxd3zQbe7RM97TH-mk0KPY",
    authDomain: "elite-hacks.firebaseapp.com",
    projectId: "elite-hacks",
    storageBucket: "elite-hacks.firebasestorage.app",
    messagingSenderId: "845839326219",
    appId: "1:845839326219:web:c027cc012b6a4b085abb0e",
    measurementId: "G-LB7JLKMTYL"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
