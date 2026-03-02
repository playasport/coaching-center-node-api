"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const locale_routes_1 = __importDefault(require("./locale.routes"));
const academyAuth_routes_1 = __importDefault(require("./academy/academyAuth.routes"));
const userAuth_routes_1 = __importDefault(require("./userAuth.routes"));
const location_routes_1 = __importDefault(require("./location.routes"));
const locationController = __importStar(require("../controllers/location.controller"));
const basic_routes_1 = __importDefault(require("./basic.routes"));
const coachingCenter_routes_1 = __importDefault(require("./academy/coachingCenter.routes"));
const employee_routes_1 = __importDefault(require("./academy/employee.routes"));
const batch_routes_1 = __importDefault(require("./academy/batch.routes"));
const booking_routes_1 = __importDefault(require("./academy/booking.routes"));
const student_routes_1 = __importDefault(require("./academy/student.routes"));
const user_routes_1 = __importDefault(require("./academy/user.routes"));
const banner_routes_1 = __importDefault(require("./academy/banner.routes"));
const payoutAccount_routes_1 = __importDefault(require("./academy/payoutAccount.routes"));
const payout_routes_1 = __importDefault(require("./academy/payout.routes"));
const dashboard_routes_1 = __importDefault(require("./academy/dashboard.routes"));
const coachingCenterRating_routes_1 = __importDefault(require("./academy/coachingCenterRating.routes"));
const role_routes_1 = __importDefault(require("./role.routes"));
const participant_routes_1 = __importDefault(require("./participant.routes"));
const booking_routes_2 = __importDefault(require("./booking.routes"));
const transaction_routes_1 = __importDefault(require("./transaction.routes"));
const dashboard_routes_2 = __importDefault(require("./dashboard.routes"));
const rating_routes_1 = __importDefault(require("./rating.routes"));
const webhook_routes_1 = __importDefault(require("./webhook.routes"));
const notification_routes_1 = __importDefault(require("./notification.routes"));
const notification_routes_2 = __importDefault(require("./academy/notification.routes"));
const academy_routes_1 = __importDefault(require("./academy.routes"));
const home_routes_1 = __importDefault(require("./home.routes"));
const sitemap_routes_1 = __importDefault(require("./sitemap.routes"));
const reel_routes_1 = __importDefault(require("./reel.routes"));
const highlight_routes_1 = __importDefault(require("./highlight.routes"));
const settings_routes_1 = __importDefault(require("./settings.routes"));
const banner_routes_2 = __importDefault(require("./banner.routes"));
const cmsPage_routes_1 = __importDefault(require("./cmsPage.routes"));
const search_routes_1 = __importDefault(require("./search.routes"));
const admin_1 = __importDefault(require("./admin"));
const emailTemplate_routes_1 = __importDefault(require("./test/emailTemplate.routes"));
const academyController = __importStar(require("../controllers/academy.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const i18n_1 = require("../utils/i18n");
const ApiResponse_1 = require("../utils/ApiResponse");
const router = (0, express_1.Router)();
router.use('/locale', locale_routes_1.default);
router.use('/academy/auth', academyAuth_routes_1.default);
router.use('/user/auth', userAuth_routes_1.default);
router.use('/user/participant', participant_routes_1.default);
router.use('/user/booking', booking_routes_2.default);
router.use('/user/transactions', transaction_routes_1.default);
router.use('/user/dashboard', dashboard_routes_2.default);
router.use('/user/ratings', rating_routes_1.default);
router.use('/user/notifications', notification_routes_1.default);
router.use('/location', location_routes_1.default);
/**
 * @swagger
 * /top-cities:
 *   get:
 *     summary: Get top 15 cities with academy and sports counts
 *     tags: [Location]
 *     description: Retrieve the top 15 cities based on the number of active academies. Returns city name, academy count, and unique sports count for each city.
 *     responses:
 *       200:
 *         description: Top cities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Top cities retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     cities:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TopCity'
 *       500:
 *         description: Server error
 */
router.get('/top-cities', locationController.getTopCities);
/**
 * @swagger
 * /city/{cityName}:
 *   get:
 *     summary: Get academies by city name (alias route)
 *     tags: [Academy]
 *     description: Get list of academies in a specific city with sport-specific data and images. Returns academies with one image from sport_details per academy. This is an alias for /academies/city/{cityName}. This is an unprotected route.
 *     parameters:
 *       - in: path
 *         name: cityName
 *         required: true
 *         schema:
 *           type: string
 *         description: City name (case-insensitive)
 *         example: "Kolkata"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: Academies retrieved successfully with sport-specific data and images
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Academies retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AcademyListItem'
 *                       description: List of academies with sport-specific data and one image per academy
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 50
 *                         totalPages:
 *                           type: integer
 *                           example: 5
 *                         hasNextPage:
 *                           type: boolean
 *                           example: true
 *                         hasPrevPage:
 *                           type: boolean
 *                           example: false
 */
router.get('/city/:cityName', auth_middleware_1.optionalAuthenticate, academyController.getAcademiesByCity);
/**
 * @swagger
 * /sport/{slug}:
 *   get:
 *     summary: Get academies by sport slug (alias route)
 *     tags: [Academy]
 *     description: Get academies that offer a specific sport. This is an alias for /academies/sport/{slug}. If location (latitude, longitude) is provided, academies are sorted by distance (nearest first) and distance is shown in km. This is an unprotected route.
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Sport slug (e.g., 'cricket', 'football')
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of records per page
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: User's latitude (optional, for distance-based sorting)
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: User's longitude (optional, for distance-based sorting)
 *     responses:
 *       200:
 *         description: Academies retrieved successfully
 *       404:
 *         description: Sport not found
 */
router.get('/sport/:slug', auth_middleware_1.optionalAuthenticate, academyController.getAcademiesBySport);
router.use('/test/email-templates', emailTemplate_routes_1.default);
router.use('/', basic_routes_1.default);
router.use('/academy/coaching-center', coachingCenter_routes_1.default);
router.use('/academy/employee', employee_routes_1.default);
router.use('/academy/batch', batch_routes_1.default);
router.use('/academy/booking', booking_routes_1.default);
router.use('/academy/my-student', student_routes_1.default);
router.use('/academy/user', user_routes_1.default);
router.use('/academy/banners', banner_routes_1.default);
router.use('/academy/notifications', notification_routes_2.default);
router.use('/academy/payout-account', payoutAccount_routes_1.default);
router.use('/academy/my-payouts', payout_routes_1.default);
router.use('/academy/dashboard', dashboard_routes_1.default);
router.use('/academy/ratings', coachingCenterRating_routes_1.default);
router.use('/role', role_routes_1.default);
router.use('/webhook', webhook_routes_1.default);
router.use('/home', home_routes_1.default);
router.use('/sitemap', sitemap_routes_1.default);
router.use('/', reel_routes_1.default);
router.use('/', highlight_routes_1.default);
router.use('/settings', settings_routes_1.default);
router.use('/banners', banner_routes_2.default);
router.use('/pages', cmsPage_routes_1.default);
router.use('/search', search_routes_1.default);
// Admin routes - must be registered before public routes to avoid conflicts
router.use('/admin', admin_1.default);
// Public academy routes - must be registered after other routes to avoid conflicts
router.use('/academies', academy_routes_1.default);
router.get('/health', (_req, res) => {
    const response = new ApiResponse_1.ApiResponse(200, { timestamp: new Date().toISOString() }, (0, i18n_1.t)('health.serverRunning'));
    res.json(response);
});
exports.default = router;
//# sourceMappingURL=index.js.map