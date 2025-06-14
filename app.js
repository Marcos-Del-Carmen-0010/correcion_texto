const express = require('express');
const path = require('path');
const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'src')));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.render('index');
});


app.use('/upload', require('./routes/upload'));

app.listen(3030, () => {
  console.log('Servidor en http://localhost:3000');
});
