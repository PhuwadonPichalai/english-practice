// ระบบบัญชี + เซฟความคืบหน้าบน Firebase (Auth + Firestore)
// ไฟล์นี้โหลดแบบ module และเปิด API ให้ app.js ผ่าน window.WUCloud
const cfg = window.WU_FIREBASE_CONFIG;
const V = "13.2.0";

const listeners = new Set();
const emit = (user) => listeners.forEach((fn) => fn(user));

const api = {
  enabled: !!cfg,
  ready: false,
  user: null,
  onAuth(fn) { listeners.add(fn); if (api.ready) fn(api.user); },
};
window.WUCloud = api;
window.dispatchEvent(new Event("wu-cloud-ready"));

const ERR = {
  "auth/invalid-credential": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  "auth/wrong-password": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  "auth/user-not-found": "ไม่พบบัญชีที่ใช้อีเมลนี้",
  "auth/invalid-email": "รูปแบบอีเมลไม่ถูกต้อง",
  "auth/email-already-in-use": "อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบแทน",
  "auth/weak-password": "รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร",
  "auth/missing-password": "กรุณาใส่รหัสผ่าน",
  "auth/too-many-requests": "ลองหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่",
  "auth/network-request-failed": "เชื่อมต่ออินเทอร์เน็ตไม่ได้ ลองใหม่อีกครั้ง",
  "auth/popup-closed-by-user": "ปิดหน้าต่างเข้าสู่ระบบก่อนทำเสร็จ",
  "auth/cancelled-popup-request": "ปิดหน้าต่างเข้าสู่ระบบก่อนทำเสร็จ",
  "auth/unauthorized-domain": "โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase (Authentication → Settings → Authorized domains)",
  "auth/operation-not-allowed": "วิธีเข้าสู่ระบบนี้ยังไม่ได้เปิดใช้ใน Firebase",
};
const thaiError = (e) => ERR[e && e.code] || "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง" + (e && e.code ? ` (${e.code})` : "");

if (cfg) {
  try {
    const base = `https://www.gstatic.com/firebasejs/${V}/`;
    const [{ initializeApp }, A, F] = await Promise.all([
      import(base + "firebase-app.js"),
      import(base + "firebase-auth.js"),
      import(base + "firebase-firestore.js"),
    ]);
    const app = initializeApp(cfg);
    const auth = A.getAuth(app);
    auth.languageCode = "th";
    const db = F.getFirestore(app);
    const ref = (uid) => F.doc(db, "users", uid);

    const wrap = (fn) => async (...args) => {
      try { return { ok: true, value: await fn(...args) }; }
      catch (e) { return { ok: false, error: thaiError(e), code: e && e.code }; }
    };

    Object.assign(api, {
      signInGoogle: wrap(async () => {
        const provider = new A.GoogleAuthProvider();
        try { await A.signInWithPopup(auth, provider); }
        catch (e) {
          if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") {
            await A.signInWithRedirect(auth, provider);
          } else throw e;
        }
      }),
      signInEmail: wrap((email, pass) => A.signInWithEmailAndPassword(auth, email, pass)),
      signUpEmail: wrap(async (name, email, pass) => {
        const cred = await A.createUserWithEmailAndPassword(auth, email, pass);
        if (name) await A.updateProfile(cred.user, { displayName: name });
        emit(api.user = userInfo(cred.user));
      }),
      resetPassword: wrap((email) => A.sendPasswordResetEmail(auth, email)),
      signOut: wrap(() => A.signOut(auth)),
      async load() {
        if (!api.user) return null;
        const snap = await F.getDoc(ref(api.user.uid));
        if (!snap.exists()) return null;
        const d = snap.data();
        try { return JSON.parse(d.progress); } catch (e) { return null; }
      },
      async save(progress) {
        if (!api.user) return;
        await F.setDoc(ref(api.user.uid), {
          progress: JSON.stringify(progress),
          name: api.user.name || "",
          updatedAt: F.serverTimestamp(),
        });
      },
    });

    const userInfo = (u) => u && {
      uid: u.uid,
      name: u.displayName || (u.email ? u.email.split("@")[0] : "ผู้เล่น"),
      email: u.email || "",
      photo: u.photoURL || "",
    };
    A.getRedirectResult(auth).catch(() => {});
    A.onAuthStateChanged(auth, (u) => {
      api.user = userInfo(u);
      api.ready = true;
      emit(api.user);
    });
  } catch (e) {
    console.error("[WordUp] Firebase failed to load", e);
    api.enabled = false;
    api.loadError = true;
    api.ready = true;
    emit(null);
  }
} else {
  api.ready = true;
  emit(null);
}
