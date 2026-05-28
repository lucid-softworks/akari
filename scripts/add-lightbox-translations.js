#!/usr/bin/env node
/* eslint-disable */
/**
 * Creates translations/<locale>/lightbox.json for every locale and
 * wires it into each locale's index.ts barrel. The English source lives
 * in translations/en/lightbox.json (already added by hand); this script
 * fills the other 35 locales and is re-runnable.
 *
 * Run: node scripts/add-lightbox-translations.js
 */

const fs = require('fs');
const path = require('path');

const T = path.resolve(__dirname, '../apps/akari/translations');

// Per-locale strings. `frame` keeps the {{current}} / {{total}} interp
// placeholders. Section headers (ALT / CAMERA / EXPOSURE / FILE) and
// the VIEWING status are rendered uppercase in a monospace readout, so
// they stay short and bold across locales.
const L = {
  ar: { info: 'معلومات', viewing: 'عرض', frame: 'لقطة {{current}} / {{total}}', alt: 'النص البديل', camera: 'الكاميرا', exposure: 'التعريض', file: 'الملف', model: 'الطراز', make: 'الصانع', lens: 'العدسة', aperture: 'فتحة العدسة', shutter: 'الغالق', iso: 'ISO', focalLength: 'البعد البؤري', flash: 'الفلاش', dimensions: 'الأبعاد', format: 'الصيغة', size: 'الحجم', hintsWeb: '← → تنقل   I معلومات   ESC إغلاق', hintsTouch: 'اسحب للأسفل للإغلاق' },
  az: { info: 'Məlumat', viewing: 'BAXIŞ', frame: 'KADR {{current}} / {{total}}', alt: 'ALT', camera: 'KAMERA', exposure: 'EKSPOZİSİYA', file: 'FAYL', model: 'model', make: 'istehsalçı', lens: 'lens', aperture: 'diafraqma', shutter: 'sürət', iso: 'iso', focalLength: 'fokus məsafəsi', flash: 'fləş', dimensions: 'ölçülər', format: 'format', size: 'həcm', hintsWeb: '← → KEÇİD   I MƏLUMAT   ESC BAĞLA', hintsTouch: 'Bağlamaq üçün aşağı sürüşdür' },
  bg: { info: 'Информация', viewing: 'ПРЕГЛЕД', frame: 'КАДЪР {{current}} / {{total}}', alt: 'ALT', camera: 'КАМЕРА', exposure: 'ЕКСПОЗИЦИЯ', file: 'ФАЙЛ', model: 'модел', make: 'марка', lens: 'обектив', aperture: 'бленда', shutter: 'затвор', iso: 'iso', focalLength: 'фокусно разст.', flash: 'светкавица', dimensions: 'размери', format: 'формат', size: 'размер', hintsWeb: '← → НАВ   I ИНФО   ESC ЗАТВ', hintsTouch: 'Плъзни надолу за затваряне' },
  cs: { info: 'Informace', viewing: 'PROHLÍŽENÍ', frame: 'SNÍMEK {{current}} / {{total}}', alt: 'ALT', camera: 'FOTOAPARÁT', exposure: 'EXPOZICE', file: 'SOUBOR', model: 'model', make: 'značka', lens: 'objektiv', aperture: 'clona', shutter: 'závěrka', iso: 'iso', focalLength: 'ohnisko', flash: 'blesk', dimensions: 'rozměry', format: 'formát', size: 'velikost', hintsWeb: '← → NAV   I INFO   ESC ZAVŘÍT', hintsTouch: 'Zavřete přejetím dolů' },
  cy: { info: 'Gwybodaeth', viewing: 'GWYLIO', frame: 'FFRÂM {{current}} / {{total}}', alt: 'ALT', camera: 'CAMERA', exposure: 'AMLYGIAD', file: 'FFEIL', model: 'model', make: 'gwneuthurwr', lens: 'lens', aperture: 'agorfa', shutter: 'caead', iso: 'iso', focalLength: 'hyd ffocal', flash: 'fflach', dimensions: 'dimensiynau', format: 'fformat', size: 'maint', hintsWeb: '← → LLYW   I GWYB   ESC CAU', hintsTouch: 'Llusgwch i lawr i gau' },
  da: { info: 'Info', viewing: 'VISER', frame: 'BILLEDE {{current}} / {{total}}', alt: 'ALT', camera: 'KAMERA', exposure: 'EKSPONERING', file: 'FIL', model: 'model', make: 'mærke', lens: 'objektiv', aperture: 'blænde', shutter: 'lukker', iso: 'iso', focalLength: 'brændvidde', flash: 'flash', dimensions: 'dimensioner', format: 'format', size: 'størrelse', hintsWeb: '← → NAV   I INFO   ESC LUK', hintsTouch: 'Stryg ned for at lukke' },
  de: { info: 'Info', viewing: 'ANSICHT', frame: 'BILD {{current}} / {{total}}', alt: 'ALT', camera: 'KAMERA', exposure: 'BELICHTUNG', file: 'DATEI', model: 'Modell', make: 'Hersteller', lens: 'Objektiv', aperture: 'Blende', shutter: 'Verschluss', iso: 'iso', focalLength: 'Brennweite', flash: 'Blitz', dimensions: 'Abmessungen', format: 'Format', size: 'Größe', hintsWeb: '← → NAV   I INFO   ESC SCHLIESSEN', hintsTouch: 'Zum Schließen nach unten wischen' },
  el: { info: 'Πληροφορίες', viewing: 'ΠΡΟΒΟΛΗ', frame: 'ΚΑΡΕ {{current}} / {{total}}', alt: 'ALT', camera: 'ΚΑΜΕΡΑ', exposure: 'ΕΚΘΕΣΗ', file: 'ΑΡΧΕΙΟ', model: 'μοντέλο', make: 'κατασκευαστής', lens: 'φακός', aperture: 'διάφραγμα', shutter: 'κλείστρο', iso: 'iso', focalLength: 'εστιακή απόστ.', flash: 'φλας', dimensions: 'διαστάσεις', format: 'μορφή', size: 'μέγεθος', hintsWeb: '← → ΠΛΟΗΓ   I ΠΛΗΡ   ESC ΚΛΕΙΣΙΜΟ', hintsTouch: 'Σύρετε προς τα κάτω για κλείσιμο' },
  es: { info: 'Info', viewing: 'VIENDO', frame: 'FOTO {{current}} / {{total}}', alt: 'ALT', camera: 'CÁMARA', exposure: 'EXPOSICIÓN', file: 'ARCHIVO', model: 'modelo', make: 'marca', lens: 'objetivo', aperture: 'apertura', shutter: 'obturador', iso: 'iso', focalLength: 'distancia focal', flash: 'flash', dimensions: 'dimensiones', format: 'formato', size: 'tamaño', hintsWeb: '← → NAV   I INFO   ESC CERRAR', hintsTouch: 'Desliza hacia abajo para cerrar' },
  fa: { info: 'اطلاعات', viewing: 'نمایش', frame: 'فریم {{current}} / {{total}}', alt: 'متن جایگزین', camera: 'دوربین', exposure: 'نوردهی', file: 'فایل', model: 'مدل', make: 'سازنده', lens: 'لنز', aperture: 'دیافراگم', shutter: 'شاتر', iso: 'iso', focalLength: 'فاصله کانونی', flash: 'فلاش', dimensions: 'ابعاد', format: 'قالب', size: 'حجم', hintsWeb: '← → پیمایش   I اطلاعات   ESC بستن', hintsTouch: 'برای بستن به پایین بکشید' },
  fi: { info: 'Tiedot', viewing: 'KATSELU', frame: 'KUVA {{current}} / {{total}}', alt: 'ALT', camera: 'KAMERA', exposure: 'VALOTUS', file: 'TIEDOSTO', model: 'malli', make: 'valmistaja', lens: 'objektiivi', aperture: 'aukko', shutter: 'suljin', iso: 'iso', focalLength: 'polttoväli', flash: 'salama', dimensions: 'mitat', format: 'muoto', size: 'koko', hintsWeb: '← → NAV   I TIEDOT   ESC SULJE', hintsTouch: 'Sulje pyyhkäisemällä alas' },
  fr: { info: 'Infos', viewing: 'APERÇU', frame: 'IMAGE {{current}} / {{total}}', alt: 'ALT', camera: 'APPAREIL', exposure: 'EXPOSITION', file: 'FICHIER', model: 'modèle', make: 'marque', lens: 'objectif', aperture: 'ouverture', shutter: 'obturateur', iso: 'iso', focalLength: 'focale', flash: 'flash', dimensions: 'dimensions', format: 'format', size: 'taille', hintsWeb: '← → NAV   I INFOS   ESC FERMER', hintsTouch: 'Glissez vers le bas pour fermer' },
  he: { info: 'מידע', viewing: 'צפייה', frame: 'פריים {{current}} / {{total}}', alt: 'טקסט חלופי', camera: 'מצלמה', exposure: 'חשיפה', file: 'קובץ', model: 'דגם', make: 'יצרן', lens: 'עדשה', aperture: 'צמצם', shutter: 'תריס', iso: 'iso', focalLength: 'אורך מוקד', flash: 'מבזק', dimensions: 'מידות', format: 'פורמט', size: 'גודל', hintsWeb: '← → ניווט   I מידע   ESC סגירה', hintsTouch: 'החלק מטה לסגירה' },
  hi: { info: 'जानकारी', viewing: 'देखना', frame: 'फ़्रेम {{current}} / {{total}}', alt: 'ALT', camera: 'कैमरा', exposure: 'एक्सपोज़र', file: 'फ़ाइल', model: 'मॉडल', make: 'निर्माता', lens: 'लेंस', aperture: 'अपर्चर', shutter: 'शटर', iso: 'iso', focalLength: 'फ़ोकल लंबाई', flash: 'फ़्लैश', dimensions: 'आयाम', format: 'प्रारूप', size: 'आकार', hintsWeb: '← → नेव   I जानकारी   ESC बंद', hintsTouch: 'बंद करने के लिए नीचे स्वाइप करें' },
  hu: { info: 'Infó', viewing: 'NÉZET', frame: 'KÉP {{current}} / {{total}}', alt: 'ALT', camera: 'FÉNYKÉPEZŐ', exposure: 'EXPOZÍCIÓ', file: 'FÁJL', model: 'modell', make: 'gyártó', lens: 'objektív', aperture: 'rekesz', shutter: 'zár', iso: 'iso', focalLength: 'fókusztáv', flash: 'vaku', dimensions: 'méretek', format: 'formátum', size: 'méret', hintsWeb: '← → NAV   I INFÓ   ESC BEZÁR', hintsTouch: 'Húzd le a bezáráshoz' },
  id: { info: 'Info', viewing: 'MELIHAT', frame: 'BINGKAI {{current}} / {{total}}', alt: 'ALT', camera: 'KAMERA', exposure: 'PENCAHAYAAN', file: 'BERKAS', model: 'model', make: 'merek', lens: 'lensa', aperture: 'bukaan', shutter: 'rana', iso: 'iso', focalLength: 'panjang fokus', flash: 'lampu kilat', dimensions: 'dimensi', format: 'format', size: 'ukuran', hintsWeb: '← → NAV   I INFO   ESC TUTUP', hintsTouch: 'Geser ke bawah untuk menutup' },
  it: { info: 'Info', viewing: 'ANTEPRIMA', frame: 'FOTO {{current}} / {{total}}', alt: 'ALT', camera: 'FOTOCAMERA', exposure: 'ESPOSIZIONE', file: 'FILE', model: 'modello', make: 'marca', lens: 'obiettivo', aperture: 'apertura', shutter: 'otturatore', iso: 'iso', focalLength: 'lunghezza focale', flash: 'flash', dimensions: 'dimensioni', format: 'formato', size: 'dimensione', hintsWeb: '← → NAV   I INFO   ESC CHIUDI', hintsTouch: 'Scorri verso il basso per chiudere' },
  ja: { info: '情報', viewing: '表示中', frame: 'フレーム {{current}} / {{total}}', alt: 'ALT', camera: 'カメラ', exposure: '露出', file: 'ファイル', model: '機種', make: 'メーカー', lens: 'レンズ', aperture: '絞り', shutter: 'シャッター', iso: 'iso', focalLength: '焦点距離', flash: 'フラッシュ', dimensions: 'サイズ', format: '形式', size: '容量', hintsWeb: '← → 移動   I 情報   ESC 閉じる', hintsTouch: '下にスワイプで閉じる' },
  ko: { info: '정보', viewing: '보기', frame: '프레임 {{current}} / {{total}}', alt: 'ALT', camera: '카메라', exposure: '노출', file: '파일', model: '모델', make: '제조사', lens: '렌즈', aperture: '조리개', shutter: '셔터', iso: 'iso', focalLength: '초점 거리', flash: '플래시', dimensions: '크기', format: '형식', size: '용량', hintsWeb: '← → 이동   I 정보   ESC 닫기', hintsTouch: '아래로 스와이프하여 닫기' },
  nl: { info: 'Info', viewing: 'WEERGAVE', frame: 'BEELD {{current}} / {{total}}', alt: 'ALT', camera: 'CAMERA', exposure: 'BELICHTING', file: 'BESTAND', model: 'model', make: 'merk', lens: 'lens', aperture: 'diafragma', shutter: 'sluiter', iso: 'iso', focalLength: 'brandpuntsafst.', flash: 'flits', dimensions: 'afmetingen', format: 'formaat', size: 'grootte', hintsWeb: '← → NAV   I INFO   ESC SLUITEN', hintsTouch: 'Veeg omlaag om te sluiten' },
  pl: { info: 'Informacje', viewing: 'PODGLĄD', frame: 'KLATKA {{current}} / {{total}}', alt: 'ALT', camera: 'APARAT', exposure: 'EKSPOZYCJA', file: 'PLIK', model: 'model', make: 'marka', lens: 'obiektyw', aperture: 'przysłona', shutter: 'migawka', iso: 'iso', focalLength: 'ogniskowa', flash: 'lampa', dimensions: 'wymiary', format: 'format', size: 'rozmiar', hintsWeb: '← → NAW   I INFO   ESC ZAMKNIJ', hintsTouch: 'Przesuń w dół, aby zamknąć' },
  pt: { info: 'Info', viewing: 'A VER', frame: 'FOTO {{current}} / {{total}}', alt: 'ALT', camera: 'CÂMARA', exposure: 'EXPOSIÇÃO', file: 'FICHEIRO', model: 'modelo', make: 'marca', lens: 'lente', aperture: 'abertura', shutter: 'obturador', iso: 'iso', focalLength: 'distância focal', flash: 'flash', dimensions: 'dimensões', format: 'formato', size: 'tamanho', hintsWeb: '← → NAV   I INFO   ESC FECHAR', hintsTouch: 'Deslize para baixo para fechar' },
  ro: { info: 'Info', viewing: 'VIZUALIZARE', frame: 'CADRU {{current}} / {{total}}', alt: 'ALT', camera: 'CAMERĂ', exposure: 'EXPUNERE', file: 'FIȘIER', model: 'model', make: 'producător', lens: 'obiectiv', aperture: 'diafragmă', shutter: 'obturator', iso: 'iso', focalLength: 'distanță focală', flash: 'bliț', dimensions: 'dimensiuni', format: 'format', size: 'mărime', hintsWeb: '← → NAV   I INFO   ESC ÎNCHIDE', hintsTouch: 'Glisează în jos pentru a închide' },
  ru: { info: 'Информация', viewing: 'ПРОСМОТР', frame: 'КАДР {{current}} / {{total}}', alt: 'ALT', camera: 'КАМЕРА', exposure: 'ЭКСПОЗИЦИЯ', file: 'ФАЙЛ', model: 'модель', make: 'произв.', lens: 'объектив', aperture: 'диафрагма', shutter: 'выдержка', iso: 'iso', focalLength: 'фокусное расст.', flash: 'вспышка', dimensions: 'размеры', format: 'формат', size: 'размер', hintsWeb: '← → НАВ   I ИНФО   ESC ЗАКРЫТЬ', hintsTouch: 'Смахните вниз, чтобы закрыть' },
  sk: { info: 'Informácie', viewing: 'ZOBRAZENIE', frame: 'SNÍMKA {{current}} / {{total}}', alt: 'ALT', camera: 'FOTOAPARÁT', exposure: 'EXPOZÍCIA', file: 'SÚBOR', model: 'model', make: 'značka', lens: 'objektív', aperture: 'clona', shutter: 'uzávierka', iso: 'iso', focalLength: 'ohnisko', flash: 'blesk', dimensions: 'rozmery', format: 'formát', size: 'veľkosť', hintsWeb: '← → NAV   I INFO   ESC ZAVRIEŤ', hintsTouch: 'Zatvorte potiahnutím nadol' },
  sl: { info: 'Informacije', viewing: 'OGLED', frame: 'SLIKA {{current}} / {{total}}', alt: 'ALT', camera: 'FOTOAPARAT', exposure: 'OSVETLITEV', file: 'DATOTEKA', model: 'model', make: 'znamka', lens: 'objektiv', aperture: 'zaslonka', shutter: 'zaklop', iso: 'iso', focalLength: 'goriščna razd.', flash: 'bliskavica', dimensions: 'dimenzije', format: 'oblika', size: 'velikost', hintsWeb: '← → NAV   I INFO   ESC ZAPRI', hintsTouch: 'Povlecite navzdol za zaprtje' },
  sv: { info: 'Info', viewing: 'VISAR', frame: 'BILD {{current}} / {{total}}', alt: 'ALT', camera: 'KAMERA', exposure: 'EXPONERING', file: 'FIL', model: 'modell', make: 'märke', lens: 'objektiv', aperture: 'bländare', shutter: 'slutare', iso: 'iso', focalLength: 'brännvidd', flash: 'blixt', dimensions: 'dimensioner', format: 'format', size: 'storlek', hintsWeb: '← → NAV   I INFO   ESC STÄNG', hintsTouch: 'Svep nedåt för att stänga' },
  th: { info: 'ข้อมูล', viewing: 'กำลังดู', frame: 'เฟรม {{current}} / {{total}}', alt: 'ALT', camera: 'กล้อง', exposure: 'การรับแสง', file: 'ไฟล์', model: 'รุ่น', make: 'ยี่ห้อ', lens: 'เลนส์', aperture: 'รูรับแสง', shutter: 'ชัตเตอร์', iso: 'iso', focalLength: 'ทางยาวโฟกัส', flash: 'แฟลช', dimensions: 'ขนาดภาพ', format: 'รูปแบบ', size: 'ขนาด', hintsWeb: '← → เลื่อน   I ข้อมูล   ESC ปิด', hintsTouch: 'ปัดลงเพื่อปิด' },
  tr: { info: 'Bilgi', viewing: 'GÖRÜNTÜLEME', frame: 'KARE {{current}} / {{total}}', alt: 'ALT', camera: 'KAMERA', exposure: 'POZLAMA', file: 'DOSYA', model: 'model', make: 'marka', lens: 'lens', aperture: 'diyafram', shutter: 'enstantane', iso: 'iso', focalLength: 'odak uzaklığı', flash: 'flaş', dimensions: 'boyutlar', format: 'biçim', size: 'boyut', hintsWeb: '← → GEZ   I BİLGİ   ESC KAPAT', hintsTouch: 'Kapatmak için aşağı kaydır' },
  uk: { info: 'Інформація', viewing: 'ПЕРЕГЛЯД', frame: 'КАДР {{current}} / {{total}}', alt: 'ALT', camera: 'КАМЕРА', exposure: 'ЕКСПОЗИЦІЯ', file: 'ФАЙЛ', model: 'модель', make: 'виробник', lens: 'об’єктив', aperture: 'діафрагма', shutter: 'витримка', iso: 'iso', focalLength: 'фокусна відст.', flash: 'спалах', dimensions: 'розміри', format: 'формат', size: 'розмір', hintsWeb: '← → НАВ   I ІНФО   ESC ЗАКРИТИ', hintsTouch: 'Проведіть вниз, щоб закрити' },
  vi: { info: 'Thông tin', viewing: 'ĐANG XEM', frame: 'KHUNG {{current}} / {{total}}', alt: 'ALT', camera: 'MÁY ẢNH', exposure: 'PHƠI SÁNG', file: 'TỆP', model: 'mẫu máy', make: 'hãng', lens: 'ống kính', aperture: 'khẩu độ', shutter: 'màn trập', iso: 'iso', focalLength: 'tiêu cự', flash: 'đèn flash', dimensions: 'kích thước', format: 'định dạng', size: 'dung lượng', hintsWeb: '← → ĐIỀU HƯỚNG   I THÔNG TIN   ESC ĐÓNG', hintsTouch: 'Vuốt xuống để đóng' },
  zh: { info: '信息', viewing: '查看中', frame: '画面 {{current}} / {{total}}', alt: 'ALT', camera: '相机', exposure: '曝光', file: '文件', model: '型号', make: '厂商', lens: '镜头', aperture: '光圈', shutter: '快门', iso: 'iso', focalLength: '焦距', flash: '闪光灯', dimensions: '尺寸', format: '格式', size: '大小', hintsWeb: '← → 导航   I 信息   ESC 关闭', hintsTouch: '向下滑动关闭' },
  'zh-TW': { info: '資訊', viewing: '檢視中', frame: '畫面 {{current}} / {{total}}', alt: 'ALT', camera: '相機', exposure: '曝光', file: '檔案', model: '型號', make: '廠商', lens: '鏡頭', aperture: '光圈', shutter: '快門', iso: 'iso', focalLength: '焦距', flash: '閃光燈', dimensions: '尺寸', format: '格式', size: '大小', hintsWeb: '← → 導覽   I 資訊   ESC 關閉', hintsTouch: '向下滑動關閉' },
};
L['en-US'] = JSON.parse(fs.readFileSync(path.join(T, 'en', 'lightbox.json'), 'utf8'));
L['zh-CN'] = L.zh;

let wrote = 0;
for (const [locale, strings] of Object.entries(L)) {
  const dir = path.join(T, locale);
  if (!fs.existsSync(dir)) {
    console.warn(`skip ${locale} (no dir)`);
    continue;
  }
  fs.writeFileSync(path.join(dir, 'lightbox.json'), JSON.stringify(strings, null, 2) + '\n');

  // Patch the barrel: add the import + the export entry alphabetically
  // after `labelDetail` (matching en's ordering) if not already present.
  const indexPath = path.join(dir, 'index.ts');
  let src = fs.readFileSync(indexPath, 'utf8');
  if (!/from '\.\/lightbox\.json'/.test(src)) {
    src = src.replace(
      /(import labelDetail from '\.\/labelDetail\.json';\n)/,
      `$1import lightbox from './lightbox.json';\n`,
    );
    src = src.replace(/(\n {2}labelDetail,\n)/, `$1  lightbox,\n`);
    fs.writeFileSync(indexPath, src);
  }
  wrote += 1;
}

console.log(`Wrote lightbox.json for ${wrote} locales.`);
