const axios = require('axios');
const { CosmosClient } = require('@azure/cosmos');
const { v4: uuidv4 } = require('uuid');

// Replace these with your actual Azure resources
const TEXT_API_KEY = process.env.TEXT_API_KEY;
const TEXT_API_ENDPOINT = process.env.TEXT_API_ENDPOINT;
const COSMOS_DB_URI = process.env.COSMOS_DB_URI;
const COSMOS_DB_KEY = process.env.COSMOS_DB_KEY;
const COSMOS_DB_NAME = 'FeedbackDB';
const COSMOS_CONTAINER_NAME = 'Feedbacks';

module.exports = async function (context, req) {
  const feedback = req.body.feedback;
  if (!feedback) {
    context.res = { status: 400, body: "Missing feedback" };
    return;
  }

  // Analyze sentiment
  const response = await axios.post(
    `${TEXT_API_ENDPOINT}/text/analytics/v3.1/sentiment`,
    {
      documents: [
        {
          id: "1",
          language: "en",
          text: feedback
        }
      ]
    },
    {
      headers: {
        'Ocp-Apim-Subscription-Key': TEXT_API_KEY,
        'Content-Type': 'application/json'
      }
    }
  );

  const result = response.data.documents[0];
  const sentiment = result.sentiment;
  const scores = result.confidenceScores;

  // Save to Cosmos DB
  const client = new CosmosClient({ endpoint: COSMOS_DB_URI, key: COSMOS_DB_KEY });
  const container = client.database(COSMOS_DB_NAME).container(COSMOS_CONTAINER_NAME);
  await container.items.create({
    id: uuidv4(),
    feedback,
    sentiment,
    scores,
    timestamp: new Date().toISOString()
  });

  context.res = {
    status: 200,
    body: {
      sentiment,
      scores
    }
  };
};
