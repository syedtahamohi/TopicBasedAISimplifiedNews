const express = require('express');
const bodyParser = require('body-parser');
var cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const NewsAPI = require('newsapi');
const newsApi = new NewsAPI('key');

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI('key');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

app.listen(3000, () => console.log('Application is listening on port 3000.'));

app.post('/', async (req, res) => {

        let newsPromise = getNewsPromise(req.body.topic);

        let articles = new Array();
        await newsPromise
            .then((data) => {
                articles = data;
                articles = articles.slice(0, 10);
            })
            .catch((error) => {
                console.error("Error:", error);
            });
        let result = new Array();
        const prompt = "Summarize this.";
        for (let i = 0; i < articles.length; i++) {

            let AIPromise = getAIPromise(model, prompt + articles[i].content);

            await AIPromise
                .then((response) => {
                    result.push({
                        "title": articles[i].title,
                        "url": articles[i].url,
                        "image": articles[i].urlToImage,
                        "content": response.response.candidates[0].content.parts[0].text,
                        "publishedAt": articles[i].publishedAt.substring(0, 10)
                    });
                })
                .catch((error) => {
                    console.error("Error:", error);
                });
        }
        console.log('Result' + result);
        if(result.length == 0)
        {
            res.send({ result: false });
        }
        else
        {
            res.send({ result: true, news: Array.from(result) })
        };
})

function getNewsPromise(topic) {

    return new Promise((resolve, reject) => {

        newsApi.v2.everything({
            q: topic,
            language: 'en',
            sortBy: 'publishedAt',
            pageSize: 10,
            page: 1
        })
        .then(response => {
            resolve(response.articles);
        })
        .catch(error => reject(error));
    });
}

function getAIPromise(model, prompt) {
    return new Promise((resolve, reject) => {

        model.generateContent(prompt)
            .then(reply => resolve(reply))
            .catch(error => reject(error));
    });
}
