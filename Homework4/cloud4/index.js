const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());

app.use(express.static('public'));


const mongoUri = process.env.MONGO_URI;

mongoose.connect(mongoUri)
    .then(() => console.log('Connected to Cosmos DB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Explicitly use the 'cars' collection
const Item = mongoose.model('Item', new mongoose.Schema({
    name: String
}), 'cars');


const translateText = async (text, toLanguage) => {
    const response = await axios.post(
        `${process.env.TRANSLATOR_ENDPOINT}/translate?api-version=3.0&to=${toLanguage}`,
        [{ Text: text }],
        {
            headers: {
                'Ocp-Apim-Subscription-Key': process.env.TRANSLATOR_KEY,
                'Content-Type': 'application/json'
            }
        }
    );
    return response.data;
};




const axios = require('axios');

const endpoint = process.env.COMPUTER_VISION_ENDPOINT;
const key = process.env.COMPUTER_VISION_KEY;

async function analyzeImage(imageUrl) {
    const url = `${endpoint}/vision/v3.2/analyze?visualFeatures=Description`;
    const response = await axios.post(url, { url: imageUrl }, {
        headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Content-Type': 'application/json'
        }
    });
    return response.data;
}

app.post('/translate', async (req, res) => {
    const { text, toLanguage } = req.body;
    if (!text || !toLanguage) {
        return res.status(400).json({ error: 'Missing text or toLanguage' });
    }

    try {
        const result = await translateText(text, toLanguage);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error translating text');
    }
});


app.post('/analyze', async (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl) {
        return res.status(400).send('imageUrl is required');
    }

    try {
        const result = await analyzeImage(imageUrl);
        const description = result.description?.captions?.[0]?.text || 'No description found';

        const item = new Item({
            name: description
        });
        await item.save();

        res.json({
            message: 'Analysis saved to database',
            savedItem: item
        });
    } catch (err) {
        console.error('Error analyzing or saving:', err);
        res.status(500).send('Error analyzing image or saving to database');
    }
});




app.get('/', (req, res) => {
    res.json({ message: 'Hello, Azure from Node.js!' });
});

app.post('/items', async (req, res) => {
    const item = new Item({ name: req.body.name });
    await item.save();
    res.json(item);
});

app.get('/items', async (req, res) => {
    const items = await Item.find();
    res.json(items);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
