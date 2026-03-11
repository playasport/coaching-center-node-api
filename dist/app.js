"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const routes_1 = __importDefault(require("./routes"));
const error_middleware_1 = require("./middleware/error.middleware");
const locale_middleware_1 = require("./middleware/locale.middleware");
const swagger_1 = require("./config/swagger");
const swaggerHtmlTemplate_1 = require("./utils/swaggerHtmlTemplate");
const env_1 = require("./config/env");
const app = (0, express_1.default)();
// Disable ETag completely
app.disable('etag');
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
const allowedOrigins = env_1.config.cors.allowedOrigins;
const corsOptions = {
    origin: function (origin, callback) {
        // allow server-to-server, mobile apps, Postman
        if (!origin)
            return callback(null, true);
        if (allowedOrigins === true || (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin))) {
            return callback(null, true);
        }
        return callback(new Error('CORS blocked: ' + origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Cache-Control', 'Pragma'],
    maxAge: 86400,
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({
    verify: (req, _res, buf) => {
        if (req.originalUrl?.includes('/webhook')) {
            req.rawBody = buf.toString('utf8');
        }
    },
}));
app.use(express_1.default.urlencoded({ extended: true }));
// Locale middleware (should be early in the middleware chain)
app.use(locale_middleware_1.localeMiddleware);
// Swagger Documentation - Only available in non-production environments
if (env_1.config.nodeEnv !== 'production') {
    app.get('/api-docs', (_req, res) => {
        const html = (0, swaggerHtmlTemplate_1.generateSwaggerHtml)(swagger_1.swaggerSpec);
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    });
}
// Root welcome message
app.get('/', (_req, res) => {
    res.json({ message: 'Welcome to Play A Sport.' });
});
// Routes
app.use('/api/v1', routes_1.default);
// Error handling middleware (must be last)
app.use(error_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map