# WordUp — ฝึกศัพท์ภาษาอังกฤษ

เว็บฝึกคำศัพท์ภาษาอังกฤษ ระดับ CEFR A1–C1 ธีม minimal สีขาว มีโหมดมืด
เป็นเว็บ static ล้วน (HTML/CSS/JS) ไม่ต้อง build จึง deploy บน GitHub Pages ได้ฟรี

## โหมดฝึก
- 🃏 แฟลชการ์ด: พลิกดูความหมาย แล้วกดว่าจำได้หรือยัง
- 🇹🇭 เลือกความหมาย: เห็นคำอังกฤษ แล้วเลือกคำแปลไทย
- 🔤 เลือกคำศัพท์: เห็นคำไทย แล้วเลือกคำอังกฤษ
- ⌨️ พิมพ์สะกดคำ: เห็นคำไทย แล้วพิมพ์คำอังกฤษเอง
- 🎧 ฟังแล้วตอบ: ฟังเสียง แล้วเลือกความหมาย
- ✏️ เติมคำในประโยค: เลือกคำที่ใส่ในช่องว่างได้ถูก

ความคืบหน้า สถิติวันติดต่อกัน และคะแนนดีที่สุด เก็บไว้ในเบราว์เซอร์ของผู้เล่นแต่ละคน (localStorage)
ระบบจะสุ่มคำที่ผู้เล่นตอบผิดบ่อยมาให้ฝึกก่อน

## รันบนเครื่อง
เปิด `index.html` ได้เลย หรือรันคำสั่ง
```bash
npx serve .
```

## Deploy บน GitHub Pages
1. สร้าง repo ใหม่บน GitHub (เช่น `english-practice`)
2. push โค้ดขึ้นไป
   ```bash
   git init
   git add .
   git commit -m "WordUp: first version"
   git branch -M main
   git remote add origin https://github.com/<username>/english-practice.git
   git push -u origin main
   ```
3. ไปที่ repo → **Settings → Pages** → ตรง **Source** เลือก **GitHub Actions**
4. รอประมาณ 1 นาที เว็บจะขึ้นที่ `https://<username>.github.io/english-practice/`

หลังจากนี้ ทุกครั้งที่ push ขึ้น `main` เว็บจะอัปเดตเอง

## เพิ่มคำศัพท์
แก้ไฟล์ `data/words.js` โดยเพิ่มแถวในระดับที่ต้องการ
```js
["word", "n.", "ความหมาย", "An example sentence with the word."],
```
ประโยคตัวอย่างต้องมีคำนั้นอยู่ด้วย เพราะโหมดเติมคำใช้ประโยคนี้
