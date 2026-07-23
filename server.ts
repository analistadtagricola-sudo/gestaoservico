import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to get GoogleGenAI client
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({ apiKey });
}

// 1. Chat Endpoint with Multi-Turn History, Custom System Instruction & Model Selection
app.post('/api/chat', async (req, res) => {
  const startTime = Date.now();
  try {
    const { messages, model = 'gemini-3.6-flash', systemInstruction, temperature = 0.7 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const ai = getGenAIClient();

    // Format chat history into contents array for Gemini
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    // Generate content
    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: systemInstruction || undefined,
        temperature: temperature,
      },
    });

    const latencyMs = Date.now() - startTime;
    const replyText = response.text || 'Nenhuma resposta gerada.';

    return res.json({
      reply: replyText,
      latencyMs,
      modelUsed: model,
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    const latencyMs = Date.now() - startTime;
    return res.status(500).json({
      error: error.message || 'Erro ao processar mensagem.',
      latencyMs,
    });
  }
});

// 2. Low-Latency Fast Endpoint (gemini-3.1-flash-lite)
app.post('/api/low-latency', async (req, res) => {
  const startTime = Date.now();
  try {
    const { prompt, taskType = 'quick_response', systemInstruction } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const ai = getGenAIClient();

    // Use ultrafast gemini-3.1-flash-lite model
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || 'Você é um assistente ultra rápido e conciso.',
        temperature: 0.3,
      },
    });

    const latencyMs = Date.now() - startTime;

    return res.json({
      output: response.text || 'Sem resposta.',
      latencyMs,
      taskType,
      modelUsed: 'gemini-3.1-flash-lite',
    });
  } catch (error: any) {
    console.error('Low latency error:', error);
    const latencyMs = Date.now() - startTime;
    return res.status(500).json({
      error: error.message || 'Erro na resposta de baixa latência.',
      latencyMs,
    });
  }
});

// 3. High Quality Image Generation Endpoint (gemini-3-pro-image-preview with 1K, 2K, 4K affordance)
app.post('/api/generate-image', async (req, res) => {
  const startTime = Date.now();
  try {
    const { prompt, model = 'gemini-3-pro-image-preview', resolution = '1K', aspectRatio = '1:1' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required for image generation.' });
    }

    const ai = getGenAIClient();

    // Enhance prompt with resolution guidance for quality
    let enhancedPrompt = prompt;
    if (resolution === '4K') {
      enhancedPrompt += ', highly detailed, ultra high resolution 4K quality, masterwork, sharp focus';
    } else if (resolution === '2K') {
      enhancedPrompt += ', high quality 2K resolution, detailed, crisp details';
    }

    let imageUrl = '';

    try {
      const imgModelToUse = model === 'gemini-3-pro-image-preview' ? 'gemini-3-pro-image-preview' : 'imagen-3.0-generate-002';
      
      const imgResponse = await ai.models.generateImages({
        model: imgModelToUse,
        prompt: enhancedPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: aspectRatio as any,
          imageSize: resolution as any,
        },
      });

      if (imgResponse.generatedImages && imgResponse.generatedImages.length > 0) {
        const base64Bytes = imgResponse.generatedImages[0].image?.imageBytes;
        if (base64Bytes) {
          imageUrl = `data:image/png;base64,${base64Bytes}`;
        }
      }
    } catch (primaryErr: any) {
      console.warn('Primary image endpoint warning:', primaryErr.message);

      try {
        const fallbackRes = await ai.models.generateImages({
          model: 'imagen-3.0-generate-002',
          prompt: enhancedPrompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: aspectRatio as any,
          },
        });
        if (fallbackRes.generatedImages && fallbackRes.generatedImages[0]?.image?.imageBytes) {
          imageUrl = `data:image/png;base64,${fallbackRes.generatedImages[0].image.imageBytes}`;
        }
      } catch (fallbackErr: any) {
        console.error('Image generation fallback failed:', fallbackErr);
        throw new Error(fallbackErr.message || primaryErr.message || 'Falha ao gerar imagem.');
      }
    }

    if (!imageUrl) {
      throw new Error('A API não retornou uma imagem válida.');
    }

    const latencyMs = Date.now() - startTime;

    return res.json({
      imageUrl,
      latencyMs,
      prompt,
      resolution,
      aspectRatio,
      modelUsed: model,
    });
  } catch (error: any) {
    console.error('Image generation error:', error);
    const latencyMs = Date.now() - startTime;
    return res.status(500).json({
      error: error.message || 'Erro ao gerar imagem.',
      latencyMs,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 App Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
