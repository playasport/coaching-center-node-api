import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { localeMiddleware } from './middleware/locale.middleware';
import { swaggerSpec } from './config/swagger';
import { generateSwaggerHtml } from './utils/swaggerHtmlTemplate';
import { config } from './config/env';

const app: Application = express();

// Middleware
// app.use(cors({
//   origin: [
//     'http://localhost:3000',
//     'https://frontend.playasport.in',
//     'https://coaching-center-panel-ui-be4h.vercel.app/'
//   ],
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//   credentials: true
// }));

const allowedOrigins = config.cors.allowedOrigins;
  
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // allow server-to-server, mobile apps, Postman
    if (!origin) return callback(null, true);

    if (allowedOrigins === true || (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin))) {
      return callback(null, true);
    }

    return callback(new Error('CORS blocked: ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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

// Swagger Documentation - Only available in non-production environments
if (config.nodeEnv !== 'production') {
  app.get('/api-docs', (_req: Request, res: Response) => {
    const html = generateSwaggerHtml(swaggerSpec);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });
}

// Root welcome message
app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Welcome to Play A Sport.' });
});

// Routes
app.use('/api/v1', routes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

