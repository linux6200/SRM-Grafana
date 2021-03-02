const express = require('express');
const bodyParser = require("body-parser");
const app = express(); 
const VMAX = require('./controllers/VMAX')
const VPLEX = require('./controllers/VPLEX')
const port = process.env.port || 4000;

//Here we are configuring express to use body-parser as middle-ware.
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());



// GET method route
app.get('/', function (req, res) {
    res.send('GET request to the homepage')
})

// POST method route
app.post('/', function (req, res) {
    res.send('POST request to the homepage')
})

app.use('/grafana/vmax', VMAX);
app.use('/grafana/vplex', VPLEX);

app.listen(port, function () {
    console.log('Example app listening on port 3000!');
});