const express = require('express');
const  path = require('path');
const bodyParser = require('body-parser');
const serveStatic = require('serve-static')
const request = require('request');
const sqlite3 = require('sqlite3').verbose();
const app = express();
//Define OpenWeatherMap API Key
const apiKey = 'bf54c78a174a299d6d795a4f55c90792';

//Setup Express App
app.use(serveStatic(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs')

//Init DB Connection
let db = new sqlite3.Database(__dirname + '/history.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, function(err) {
    if (err) {
      console.log(err.message);
    }
});

//Display content
function renderWithHistory(res, weatherText, errorText) {
    let sql = 'SELECT * FROM weather_history ORDER BY time DESC';
    db.all(sql, [], function(err, rows) {
        if (err) {
            errorText = err.message;
            console.log(err.message);
        }
        res.render('index', {weather: weatherText, error: errorText, history: rows});
    });
}

//Configure Paths
app.get('/', function (req, res) {
    renderWithHistory(res, null, null);
})

app.post('/', function (req, res) {
    let city = req.body.city;
    let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`
    request(url, function (err, response, body) {
    if(err){
        renderWithHistory(res, null, 'Error, please try again');
    } else {
        let weather = JSON.parse(body)
        if(weather.main == undefined){
                renderWithHistory(res, null, 'Error, please try again');
            } else {
                let weatherText = `It's ${weather.main.temp} degrees in ${weather.name}!`;
                let sql = 'INSERT INTO weather_history (city, temp) VALUES(?, ?)';
                db.run(sql, [weather.name, weather.main.temp], function(err) {
                    if (err) {
                        console.log(err.message);
                    }
                    renderWithHistory(res, weatherText, null);
                });
            }
        }
    });
})

app.get('/init', function (req, res) {
    let sql = `CREATE TABLE IF NOT EXISTS weather_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        city TEXT NOT NULL,
        temp TEXT NOT NULL,
        time DATETIME DEFAULT CURRENT_TIMESTAMP
    )`;
    db.run(sql, [], function(err) {
        if(err) {
            res.send('Error: ' + err.message);
        } else {
            res.send('Successfully initialized database!!');
        }
    });

})

//Start Server
app.listen(3000, function () {
    console.log('Sample weather app listening on port 3000!')
})