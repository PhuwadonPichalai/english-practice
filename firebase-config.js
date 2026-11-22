// ตั้งค่า Firebase สำหรับระบบบัญชีและการเซฟความคืบหน้า
// ค่าเหล่านี้ไม่ใช่รหัสลับ ใส่ไว้ในโค้ดฝั่งเว็บได้ตามปกติ
// (ความปลอดภัยของข้อมูลมาจาก Firestore Security Rules ในไฟล์ firestore.rules)
//
// วิธีได้ค่า: Firebase Console → Project settings → Your apps → Web app → SDK setup and configuration
// ถ้ายังเป็น null เว็บจะทำงานแบบไม่มีบัญชี (เก็บความคืบหน้าไว้ในเบราว์เซอร์อย่างเดียว)
window.WU_FIREBASE_CONFIG = null;
/* ตัวอย่าง:
window.WU_FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  appId: "1:1234567890:web:abcdef",
};
*/
