import app from './dist/serverless.js';

export default function handler(req, res) {
  return app(req, res);
}

