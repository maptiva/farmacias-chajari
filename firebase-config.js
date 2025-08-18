
// Importar las funciones necesarias de los SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Tu configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC62b1ItiE0IzYKc8Y3tDIT5EXaOabUHOc",
    authDomain: "farmacias-chajari.firebaseapp.com",
    databaseURL: "https://farmacias-chajari-default-rtdb.firebaseio.com",
    projectId: "farmacias-chajari",
    storageBucket: "farmacias-chajari.appspot.com",
    messagingSenderId: "480200517460",
    appId: "1:480200517460:web:4cc22cd97a7b292e200ac1"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Exportar las instancias para usarlas en otros módulos
export { auth, db };
