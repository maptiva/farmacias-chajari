
// Importar instancias de Firebase y funciones de los SDK
import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    collection, 
    getDocs, 
    doc,
    getDoc,
    writeBatch 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Elementos del DOM ---
const loginContainer = document.getElementById('login-container');
const gestionContainer = document.getElementById('gestion-container');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutButton = document.getElementById('logout-button');
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const eyeIcon = document.getElementById('eye-icon');

// Contenedores de Autenticación
const resetContainer = document.getElementById('reset-container');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const backToLoginLink = document.getElementById('back-to-login-link');
const resetForm = document.getElementById('reset-form');
const resetStatus = document.getElementById('reset-status');

// Formularios de Intercambio
const exchangePrincipalForm = document.getElementById('exchange-principal-form');
const exchangeRefuerzoForm = document.getElementById('exchange-refuerzo-form');

// Selects de Farmacias
const principalPharmacyA = document.getElementById('principalPharmacyA');
const principalPharmacyB = document.getElementById('principalPharmacyB');
const refuerzoPharmacyA = document.getElementById('refuerzoPharmacyA');
const refuerzoPharmacyB = document.getElementById('refuerzoPharmacyB');

// Selects de Fechas
const principalDateA = document.getElementById('principalDateA');
const principalDateB = document.getElementById('principalDateB');
const refuerzoDateA = document.getElementById('refuerzoDateA');
const refuerzoDateB = document.getElementById('refuerzoDateB');

// Elementos de Estado
const principalStatus = document.getElementById('principal-status');
const refuerzoStatus = document.getElementById('refuerzo-status');

// --- LÓGICA DE AUTENTICACIÓN ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginContainer.classList.add('hidden');
        resetContainer.classList.add('hidden');
        gestionContainer.classList.remove('hidden');
        populateAllPharmacySelects();
    } else {
        loginContainer.classList.remove('hidden');
        gestionContainer.classList.add('hidden');
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    try {
        await signInWithEmailAndPassword(auth, loginForm.email.value, loginForm.password.value);
    } catch (error) {
        loginError.textContent = 'Email o contraseña incorrectos.';
    }
});

logoutButton.addEventListener('click', () => signOut(auth));

togglePassword.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    eyeIcon.classList.toggle('fa-eye');
    eyeIcon.classList.toggle('fa-eye-slash');
});

// --- LÓGICA DE RESETEO DE CONTRASEÑA ---
forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginContainer.classList.add('hidden');
    resetContainer.classList.remove('hidden');
});

backToLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    resetContainer.classList.add('hidden');
    loginContainer.classList.remove('hidden');
    resetStatus.textContent = ''; // Limpiar mensajes de estado
    loginError.textContent = '';
});

resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = resetForm['reset-email'].value;
    resetStatus.textContent = 'Enviando...';
    resetStatus.className = 'mt-4 text-sm text-center text-yellow-600';

    try {
        await sendPasswordResetEmail(auth, email);
        resetStatus.textContent = '¡Correo enviado! Revisa tu bandeja de entrada para restablecer la contraseña.';
        resetStatus.className = 'mt-4 text-sm text-center text-green-600';
    } catch (error) {
        console.error("Error al enviar correo de reseteo:", error);
        resetStatus.textContent = 'No se pudo enviar el correo. Verifica que la dirección sea correcta.';
        resetStatus.className = 'mt-4 text-sm text-center text-red-600';
    }
});

// --- LÓGICA DE GESTIÓN DE TURNOS ---

// Función auxiliar para formatear la fecha para el usuario
function formatDateForDisplay(dateString) { // AAAA-MM-DD -> DD-MM-AAAA
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
}

// 1. Poblar los <select> de farmacias
async function populateAllPharmacySelects() {
    try {
        const farmaciasRef = collection(db, "farmacias");
        const querySnapshot = await getDocs(farmaciasRef);
        
        const farmacias = [];
        querySnapshot.forEach((doc) => {
            farmacias.push({ id: doc.id, ...doc.data() });
        });

        // Ordenar farmacias alfabéticamente por nombre
        farmacias.sort((a, b) => a.nombre.localeCompare(b.nombre));

        const selects = [principalPharmacyA, principalPharmacyB, refuerzoPharmacyA, refuerzoPharmacyB];
        selects.forEach(sel => {
            sel.innerHTML = '<option value="">Selecciona una farmacia...</option>'; // Placeholder
            farmacias.forEach(f => {
                const option = document.createElement('option');
                option.value = f.id;
                option.textContent = f.nombre;
                sel.appendChild(option);
            });
        });
    } catch (error) {
        console.error("Error al cargar farmacias:", error);
        principalStatus.textContent = "Error al cargar la lista de farmacias.";
    }
}

// 2. Poblar los <select> de fechas cuando se elige una farmacia
async function populateDateSelect(pharmacyId, dateSelect, turnoType) {
    // Resetear y deshabilitar el select de fecha
    dateSelect.innerHTML = '<option value="">Cargando fechas...</option>';
    dateSelect.disabled = true;

    if (!pharmacyId) {
        dateSelect.innerHTML = '<option value="">Primero selecciona una farmacia</option>';
        return;
    }

    try {
        const farmaciaRef = doc(db, "farmacias", pharmacyId);
        const docSnap = await getDoc(farmaciaRef);

        if (docSnap.exists()) {
            const turnos = docSnap.data().turnos || [];
            const turnosFiltrados = turnos
                .filter(t => t.tipo === turnoType)
                .sort((a, b) => a.fecha.localeCompare(b.fecha)); // Ordenar fechas

            dateSelect.innerHTML = ''; // Limpiar opciones
            if (turnosFiltrados.length === 0) {
                dateSelect.innerHTML = `<option value="">No hay turnos de ${turnoType}</option>`;
                return;
            }
            
            turnosFiltrados.forEach(turno => {
                const option = document.createElement('option');
                option.value = turno.fecha; // El valor sigue siendo AAAA-MM-DD
                option.textContent = formatDateForDisplay(turno.fecha); // El texto es DD-MM-AAAA
                dateSelect.appendChild(option);
            });
            dateSelect.disabled = false; // Habilitar select
        } else {
            dateSelect.innerHTML = '<option value="">Farmacia no encontrada</option>';
        }
    } catch (error) {
        console.error(`Error al cargar fechas para ${pharmacyId}:`, error);
        dateSelect.innerHTML = '<option value="">Error al cargar fechas</option>';
    }
}

// 3. Lógica para manejar el intercambio (Enroque)
async function handleExchange(e, type) {
    e.preventDefault();
    const statusElement = type === 'principal' ? principalStatus : refuerzoStatus;
    statusElement.textContent = 'Procesando intercambio...';
    statusElement.className = 'mt-4 text-sm text-center text-yellow-600';

    const form = e.target;
    const pharmacyAId = form[`${type}PharmacyA`].value;
    const dateA = form[`${type}DateA`].value;
    const pharmacyBId = form[`${type}PharmacyB`].value;
    const dateB = form[`${type}DateB`].value;

    if (!pharmacyAId || !dateA || !pharmacyBId || !dateB) {
        statusElement.textContent = 'Error: Debes completar todos los campos.';
        statusElement.className = 'mt-4 text-sm text-center text-red-600';
        return;
    }
    if (pharmacyAId === pharmacyBId) {
        statusElement.textContent = 'Error: No se puede intercambiar turnos en la misma farmacia.';
        statusElement.className = 'mt-4 text-sm text-center text-red-600';
        return;
    }

    try {
        const batch = writeBatch(db);
        const refA = doc(db, "farmacias", pharmacyAId);
        const refB = doc(db, "farmacias", pharmacyBId);

        const [docA, docB] = await Promise.all([getDoc(refA), getDoc(refB)]);

        if (!docA.exists() || !docB.exists()) {
            throw new Error("Una o ambas farmacias no fueron encontradas.");
        }

        const dataA = docA.data();
        const dataB = docB.data();

        // Encontrar los turnos a intercambiar
        const turnoA = dataA.turnos.find(t => t.fecha === dateA && t.tipo === type);
        const turnoB = dataB.turnos.find(t => t.fecha === dateB && t.tipo === type);

        if (!turnoA || !turnoB) {
            throw new Error(`No se encontró el turno de tipo '${type}' en la fecha especificada para una o ambas farmacias.`);
        }

        // Crear los nuevos arrays de turnos
        const nuevosTurnosA = dataA.turnos.filter(t => t.fecha !== dateA || t.tipo !== type);
        nuevosTurnosA.push(turnoB);
        nuevosTurnosA.sort((a, b) => a.fecha.localeCompare(b.fecha)); // ¡NUEVO! Ordenar el array

        const nuevosTurnosB = dataB.turnos.filter(t => t.fecha !== dateB || t.tipo !== type);
        nuevosTurnosB.push(turnoA);
        nuevosTurnosB.sort((a, b) => a.fecha.localeCompare(b.fecha)); // ¡NUEVO! Ordenar el array

        // Añadir las operaciones de actualización al batch
        batch.update(refA, { turnos: nuevosTurnosA });
        batch.update(refB, { turnos: nuevosTurnosB });

        // Ejecutar el batch
        await batch.commit();

        statusElement.textContent = `¡Éxito! Se intercambió el turno ${type} de ${dataA.nombre} (${formatDateForDisplay(dateA)}) con el de ${dataB.nombre} (${formatDateForDisplay(dateB)}).`;
        statusElement.className = 'mt-4 text-sm text-center text-green-600';
        
        // Resetear los selects de fecha para forzar nueva selección
        populateDateSelect(pharmacyAId, form[`${type}DateA`], type);
        populateDateSelect(pharmacyBId, form[`${type}DateB`], type);

    } catch (error) {
        console.error("Error al intercambiar turnos:", error);
        statusElement.textContent = `Error: ${error.message}`;
        statusElement.className = 'mt-4 text-sm text-center text-red-600';
    }
}

// 4. Event Listeners
principalPharmacyA.addEventListener('change', (e) => populateDateSelect(e.target.value, principalDateA, 'principal'));
principalPharmacyB.addEventListener('change', (e) => populateDateSelect(e.target.value, principalDateB, 'principal'));
refuerzoPharmacyA.addEventListener('change', (e) => populateDateSelect(e.target.value, refuerzoDateA, 'refuerzo'));
refuerzoPharmacyB.addEventListener('change', (e) => populateDateSelect(e.target.value, refuerzoDateB, 'refuerzo'));

exchangePrincipalForm.addEventListener('submit', (e) => handleExchange(e, 'principal'));
exchangeRefuerzoForm.addEventListener('submit', (e) => handleExchange(e, 'refuerzo'));
