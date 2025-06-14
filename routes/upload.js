const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const axios = require('axios');

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '../uploads') });

router.post('/', upload.single('archivo'), (req, res) => {
  const archivo = req.file;
  if (!archivo) return res.send('No se subió ningún archivo');
  
  const rutaBase = path.join(__dirname, '../uploads', archivo.filename);
  const rutaTXT = `${rutaBase}-corregido.txt`;
  const rutaPDF = `${rutaBase}-corregido.pdf`;
  const rutaDOCX = `${rutaBase}-corregido.docx`;

  fs.readFile(archivo.path, 'utf8', async (err, data) => {
    if (err) return res.send('Error leyendo el archivo');

    const textoCorregido = await corregirTexto(data);

    fs.writeFileSync(rutaTXT, textoCorregido);

    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(rutaPDF));
    doc.fontSize(12).text(textoCorregido);
    doc.end();

    const docx = new Document({
      sections: [{
        children: [new Paragraph(textoCorregido)],
      }],
    });
    const buffer = await Packer.toBuffer(docx);
    fs.writeFileSync(rutaDOCX, buffer);

    res.render('results', { filename: archivo.filename });
  });
});


async function corregirTexto(texto) {
  try {
    const response = await axios.post('https://api.languagetool.org/v2/check', null, {
      params: {
        text: texto,
        language: 'es',
      }
    });

    const matches = response.data.matches;
    let textoCorregido = texto;

    matches.forEach(match => {
      if (match.replacements && match.replacements.length > 0) {
        // Reemplazamos la palabra incorrecta con la primera sugerencia
        textoCorregido = textoCorregido.replace(match.context.text.substr(match.context.offset, match.context.length), match.replacements[0].value);
      }
    });

    return textoCorregido;

  } catch (error) {
    console.error('Error corrigiendo texto:', error);
    return texto; // retorna el original si falla
  }
}

module.exports = router;
