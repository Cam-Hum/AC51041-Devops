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

app.get('/price' , async (req, res) => {
    try {
        const {id} = req.query;
        if (!id) {
            return res.status(400).json({ error: 'Missing required query parameters: id' });
        }
        const priceData = await database.collection('roomData').findOne({_id: String(id)}, {projection: {_id: 0, name: 0, locationId: 0, capacity: 0}});
        return res.json(priceData);
        
    }
    catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/rooms' , async (req, res) => {
    try {
        const roomData = await database.collection('roomData').find({}).toArray();
        return res.json(roomData);
    }
    catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});


app.get('/ping', (req, res) => {
    const dbConnected = database && database.readyState === 1;
    res.status(200).json({ status: 'ok', db: dbConnected });
});

app.listen(process.env.PORT, (req, res) => {
    console.log(`Server is listening on port ${process.env.PORT}`);
});