import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { localeMiddleware } from './middleware/locale.middleware';
import { swaggerSpec } from './config/swagger';
import { generateSwaggerHtml } from './utils/swaggerHtmlTemplate';

const app: Application = express();

// Middleware
app.use(cors());

// Raw body middleware for webhooks (must be before express.json())
app.use((req, _res, next) => {
  if (req.path.includes('/webhook')) {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      (req as any).rawBody = data;
      next();
    });
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Locale middleware (should be early in the middleware chain)
app.use(localeMiddleware);

// Swagger Documentation - Using custom HTML template with CDN assets for production compatibility
app.get('/api-docs', (_req: Request, res: Response) => {
  const html = generateSwaggerHtml(swaggerSpec);
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Serve Admin Panel Demo (if exists)
app.get('/admin-panel', (_req: Request, res: Response) => {
  const adminPanelPath = path.join(process.cwd(), 'admin-panel-demo', 'index.html');
  res.sendFile(adminPanelPath, (err) => {
    if (err) {
      res.status(404).json({ message: 'Admin panel demo not found' });
    }
  });
});

// Serve static files from admin-panel-demo
app.use('/admin-panel-demo', express.static(path.join(process.cwd(), 'admin-panel-demo')));

// Routes
app.use('/api/v1', routes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

