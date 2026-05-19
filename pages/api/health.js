export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  return res.status(200).json({
    success: true,
    message: 'Sentiment Analysis Service is up and running',
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'chat-analysis',
      version: process.env.npm_package_version || '0.1.0',
    },
  });
}
