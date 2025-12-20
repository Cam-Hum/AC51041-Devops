require('dotenv').config();
const mongo = require('mongodb')
const express = require('express');
const mongoose = require('mongoose'); 
const app = express();
const URI = process.env.MONGODB_URI

mongoose.connect(URI)
const database = mongoose.connection

database.on('error', (err) => {
    console.log(err)
})

database.once('connected', () => {
    console.log('Database connected');
});

app.use(express.json())

app.get('/' , async (req, res) => {
    try {
        const {location_id, date} = req.query;
        if (!location_id || !date) {
            return res.status(400).json({ error: 'Missing required query parameters: location_id or date' });
        }
        const weatherData = await database.collection('weatherData').findOne({location_id: parseInt(location_id), date: String(date)}, {projection: {_id: 0, location_id: 0, date: 0}});
        return res.json(weatherData);
        
    }
    catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});


app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

app.listen(process.env.PORT, (req, res) => {
    console.log(`Server is listening on port ${process.env.PORT}`);
});