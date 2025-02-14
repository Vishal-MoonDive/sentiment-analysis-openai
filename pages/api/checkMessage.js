import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { message } = req.body;

    try {
      // Check for sensitive information (e.g., phone numbers, SSN)
      const sensitiveKeywords = ['mobile number', 'ssn', 'phone', 'address'];
      const isSensitive = sensitiveKeywords.some((word) =>
        message.toLowerCase().includes(word)
      );

      if (isSensitive) {
        return res.status(400).json({ message: 'Sensitive information detected' });
      }

      // Use OpenAI GPT for analyzing meeting time and location
      const completion = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt: `Analyze this message for meeting times and locations: ${message}`,
        max_tokens: 150,
      });

      const analysisResult = completion.data.choices[0].text.trim();

      return res.status(200).json({ analysisResult });
    } catch (error) {
      return res.status(500).json({ error: 'An error occurred' });
    }
  } else {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
}
