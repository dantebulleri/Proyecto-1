/* ================================================================
   UniTrack — Firebase Authentication & Cloud Sync
   ================================================================

   CONFIGURACIÓN: Para que funcione, creá un proyecto en Firebase:

   1. Ir a https://console.firebase.google.com
   2. Click "Agregar proyecto" → poné un nombre → crear
   3. En el panel, click en el ícono web </> → registrar app
   4. Copiar los valores de firebaseConfig y pegarlos abajo
   5. Ir a Authentication → Sign-in method → habilitar "Correo/Contraseña"
   6. Ir a Firestore Database → Crear base de datos → modo test
   7. Listo! Ya podés crear cuentas y se guardan en la nube.

   ================================================================ */

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDOh7xmN2eqSpiojvbBZxDzy0ocgiocj84",
    authDomain: "seguimiento-de-carrera.firebaseapp.com",
    projectId: "seguimiento-de-carrera",
    storageBucket: "seguimiento-de-carrera.firebasestorage.app",
    messagingSenderId: "885265818809",
    appId: "1:885265818809:web:c905e01c73dfa9241aa768"
};

// ======================== INIT ========================
let auth = null;
let db = null;
let currentUser = null;
let _saveTimeout = null;

function isFirebaseConfigured() {
    return FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey.length > 0;
}

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
});

function initAuth() {
    if (!isFirebaseConfigured()) {
        // Firebase no configurado: modo local directo
        showApp();
        return;
    }

    try {
        firebase.initializeApp(FIREBASE_CONFIG);
        auth = firebase.auth();
        db = firebase.firestore();

        // Habilitar persistencia offline de Firestore
        db.enablePersistence({ synchronizeTabs: true }).catch(() => {});

        // Observar estado de auth
        auth.onAuthStateChanged(handleAuthStateChange);

        // Listeners UI
        initAuthUI();
    } catch (e) {
        console.error('Firebase init error:', e);
        showApp();
    }
}

function handleAuthStateChange(user) {
    currentUser = user;
    if (user) {
        // Logueado: cargar datos de la nube y mostrar app
        document.getElementById('sidebarUserName').textContent =
            user.displayName || user.email.split('@')[0];
        loadFromCloud().then(() => {
            showApp();
            renderAll();
        });
    } else {
        // No logueado: mostrar auth screen
        showAuthScreen();
    }
}

function showApp() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('appWrapper').classList.remove('hidden');
}

function showAuthScreen() {
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('appWrapper').classList.add('hidden');
}

// ======================== AUTH UI ========================
function initAuthUI() {
    // Tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.dataset.authTab;
            document.getElementById('loginForm').classList.toggle('hidden', target !== 'login');
            document.getElementById('registerForm').classList.toggle('hidden', target !== 'register');
            hideAuthErrors();
        });
    });

    // Login
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('.auth-submit');
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        hideAuthErrors();
        setLoading(btn, true);

        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (err) {
            showAuthError('loginError', firebaseErrorMsg(err.code));
        }
        setLoading(btn, false);
    });

    // Register
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('.auth-submit');
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirm = document.getElementById('registerPasswordConfirm').value;
        hideAuthErrors();

        if (password !== confirm) {
            showAuthError('registerError', 'Las contraseñas no coinciden');
            return;
        }
        if (password.length < 6) {
            showAuthError('registerError', 'La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(btn, true);
        try {
            const cred = await auth.createUserWithEmailAndPassword(email, password);
            await cred.user.updateProfile({ displayName: name });
            // Guardar plan por defecto en la nube para el nuevo usuario
            await saveToCloud(DEFAULT_STATE);
        } catch (err) {
            showAuthError('registerError', firebaseErrorMsg(err.code));
        }
        setLoading(btn, false);
    });

    // Forgot password
    document.getElementById('btnForgotPassword').addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value.trim();
        if (!email) {
            showAuthError('loginError', 'Ingresá tu email primero');
            return;
        }
        try {
            await auth.sendPasswordResetEmail(email);
            showAuthError('loginError', 'Se envió un email para restablecer tu contraseña');
            document.getElementById('loginError').style.background = 'var(--green-50)';
            document.getElementById('loginError').style.color = 'var(--green-600)';
        } catch (err) {
            showAuthError('loginError', firebaseErrorMsg(err.code));
        }
    });

    // Logout
    document.getElementById('btnLogout').addEventListener('click', async () => {
        if (auth) {
            await auth.signOut();
        }
    });
}

// ======================== CLOUD SYNC ========================
async function saveToCloud(data) {
    if (!db || !currentUser) return;
    try {
        await db.collection('users').doc(currentUser.uid).set({
            state: JSON.stringify(data || state),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    } catch (e) {
        console.error('Error saving to cloud:', e);
    }
}

async function loadFromCloud() {
    if (!db || !currentUser) return;
    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists && doc.data().state) {
            const cloudState = JSON.parse(doc.data().state);
            state = {
                config: { ...DEFAULT_STATE.config, ...(cloudState.config || {}) },
                materias: Array.isArray(cloudState.materias) ? cloudState.materias : [],
            };
            // También cachear en localStorage
            localStorage.setItem(APP_KEY, JSON.stringify(state));
        } else {
            // Primer login: subir defaults
            state = JSON.parse(JSON.stringify(DEFAULT_STATE));
            await saveToCloud(state);
            localStorage.setItem(APP_KEY, JSON.stringify(state));
        }
    } catch (e) {
        console.error('Error loading from cloud:', e);
        // Fallback: usar localStorage
        loadState();
    }
}

// Debounced cloud save — llamado desde saveState() en app.js
function debouncedCloudSave() {
    if (!db || !currentUser) return;
    clearTimeout(_saveTimeout);
    _saveTimeout = setTimeout(() => saveToCloud(state), 1500);
}

// ======================== HELPERS ========================
function showAuthError(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.classList.remove('hidden');
    el.style.background = '';
    el.style.color = '';
}

function hideAuthErrors() {
    document.querySelectorAll('.auth-error').forEach(el => el.classList.add('hidden'));
}

function setLoading(btn, loading) {
    if (loading) {
        btn.dataset.originalText = btn.textContent;
        btn.innerHTML = '<span class="auth-spinner"></span>';
        btn.classList.add('loading');
    } else {
        btn.textContent = btn.dataset.originalText || 'Enviar';
        btn.classList.remove('loading');
    }
}

function firebaseErrorMsg(code) {
    const msgs = {
        'auth/email-already-in-use': 'Ya existe una cuenta con ese email',
        'auth/invalid-email': 'El email no es válido',
        'auth/user-disabled': 'Esta cuenta fue deshabilitada',
        'auth/user-not-found': 'No existe una cuenta con ese email',
        'auth/wrong-password': 'La contraseña es incorrecta',
        'auth/invalid-credential': 'Email o contraseña incorrectos',
        'auth/too-many-requests': 'Demasiados intentos. Esperá un momento.',
        'auth/weak-password': 'La contraseña es muy débil (mínimo 6 caracteres)',
        'auth/network-request-failed': 'Error de conexión. Verificá tu internet.',
    };
    return msgs[code] || 'Error: ' + code;
}
