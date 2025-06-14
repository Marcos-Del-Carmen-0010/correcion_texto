const fs = require('fs');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph } = require('docx');
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');

const path = require('path');
const mammoth = require('mammoth');
const axios = require('axios');
const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '../uploads') });

router.post('/', upload.single('archivo'), async (req, res) => {
  const archivo = req.file;
  if (!archivo) return res.send('No se subió ningún archivo');

  const ext = path.extname(archivo.originalname).toLowerCase();
  const rutaBase = path.join(__dirname, '../uploads', archivo.filename);
  const rutaTXT = `${rutaBase}-corregido.txt`;
  const rutaPDF = `${rutaBase}-corregido.pdf`;
  const rutaDOCX = `${rutaBase}-corregido.docx`;

  let textoExtraido = '';

  try {
    if (ext === '.txt') {
      textoExtraido = fs.readFileSync(archivo.path, 'utf8');
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: archivo.path });
      textoExtraido = result.value;
    } else if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(archivo.path);
      const pdfData = await pdfParse(dataBuffer);
      textoExtraido = pdfData.text;
    } else {
      return res.status(400).send('Formato no compatible');
    }

    const textoCorregido = await corregirTexto(textoExtraido);

    // Guardar archivo .txt
    fs.writeFileSync(rutaTXT, textoCorregido, 'utf8');

    // Guardar archivo PDF
    const docPDF = new PDFDocument();
    docPDF.pipe(fs.createWriteStream(rutaPDF));
    docPDF.fontSize(12).text(textoCorregido);
    docPDF.end();

    // Guardar archivo DOCX
    const docx = new Document({
      sections: [{
        children: [new Paragraph(textoCorregido)],
      }],
    });
    const buffer = await Packer.toBuffer(docx);
    fs.writeFileSync(rutaDOCX, buffer);

    res.render('results', { filename: archivo.filename });

  } catch (error) {
    console.error('Error procesando archivo:', error);
    res.status(500).send('Error al procesar el archivo');
  }
});

function limpiarTextoConEspacios(texto) {
  return texto.replace(/[{};:]/g, '');
}

async function corregirTexto(texto) {
  const textoLimpio = limpiarTextoConEspacios(texto);
  try {
    const response = await axios.post('https://api.languagetool.org/v2/check', null, {
      params: {
        text: textoLimpio,
        language: 'es',
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    const matches = response.data.matches;
    let textoCorregido = textoLimpio;

    matches.forEach(match => {
      if (match.replacements?.length > 0) {
        const original = match.context.text.substr(match.context.offset, match.context.length);
        const replacement = match.replacements[0].value;
        textoCorregido = textoCorregido.replace(original, replacement);
      }
    });
    
    return textoCorregido = textoCorregido.replace(/;/g, ',');

  } catch (error) {
    console.error('Error corrigiendo texto:', error.response?.data || error.message);
    return texto;
  }
}

module.exports = router;
