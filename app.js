const express = require('express');
const path = require('path');
const app = express();

// Configura la carpeta de vistas y el motor EJS
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'src')));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'src', 'index.html'));
// });

app.get('/', (req, res) => {
  res.render('index'); // asumiendo que tienes views/index.ejs
});


app.use('/upload', require('./routes/upload'));

app.listen(3030, () => {
  console.log('Servidor en http://localhost:3000');
});
