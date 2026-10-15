const fs = require('fs');
const path = require('path');

const samplePDFContent = (title) => `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length ${70 + title.length}>>stream
BT /F1 20 Tf 50 700 TD (NoteSync Academic Resource) Tj ET
BT /F1 14 Tf 50 660 TD (${title.replace(/[\(\)]/g, '')}) Tj ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000052 00000 n 
00000000102 00000 n 
00000000212 00000 n 
00000000281 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
410
%%EOF`;

const files = [
  { dir: 'uploads/CE', name: 'sample_ds_notes.pdf', title: 'Distributed Systems Unit 1 & 2 Lecture Notes' },
  { dir: 'uploads/CE', name: 'sample_daa_qp.pdf', title: 'Design & Analysis of Algorithms Question Paper' },
  { dir: 'uploads/IT', name: 'sample_cloud_manual.pdf', title: 'Cloud Computing & Virtualization Lab Manual' },
  { dir: 'uploads/IT', name: 'sample_webtech_assign.pdf', title: 'Web Technologies Assignment 2 Solutions' },
  { dir: 'uploads/E&TC', name: 'sample_dsp_notes.pdf', title: 'Digital Signal Processing DSP Notes' },
  { dir: 'uploads/E&TC', name: 'sample_embedded_manual.pdf', title: 'Embedded Systems Project Manual' }
];

files.forEach(f => {
  const fullDir = path.join(__dirname, '..', f.dir);
  if (!fs.existsSync(fullDir)) fs.mkdirSync(fullDir, { recursive: true });
  const fullPath = path.join(fullDir, f.name);
  fs.writeFileSync(fullPath, samplePDFContent(f.title), 'utf8');
  console.log(`[CREATED SAMPLE PDF] ${fullPath}`);
});
