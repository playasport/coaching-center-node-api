import { Router } from 'express';
import * as employeeController from '../controllers/employee.controller';
import { validate } from '../middleware/validation.middleware';
import { employeeCreateSchema, employeeUpdateSchema } from '../validations/employee.validation';
import { authenticate } from '../middleware/auth.middleware';
import employeeMediaRoutes from './employeeMedia.routes';

const router = Router();

/**
 * @swagger
 * /employee:
 *   post:
 *     summary: Create a new employee
 *     tags: [Employee]
 *     description: Create a new employee. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - role
 *               - mobileNo
 *               - workingHours
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "John Doe"
 *               role:
 *                 type: string
 *                 description: Role ObjectId
 *               mobileNo:
 *                 type: string
 *                 example: "9876543210"
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               sport:
 *                 type: string
 *                 description: Sport ObjectId (optional)
 *               center:
 *                 type: string
 *                 description: Coaching Center ObjectId (optional)
 *               experience:
 *                 type: number
 *                 example: 5
 *               workingHours:
 *                 type: string
 *                 example: "9:00 AM - 6:00 PM"
 *               extraHours:
 *                 type: string
 *                 example: "2 hours"
 *               certification:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     fileUrl:
 *                       type: string
 *               salary:
 *                 type: number
 *                 example: 50000
 *     responses:
 *       201:
 *         description: Employee created successfully
 *       400:
 *         description: Validation error or invalid data
 *       401:
 *         description: Unauthorized - Authentication required
 *       409:
 *         description: Mobile number or email already exists
 */
router.post(
  '/',
  authenticate,
  validate(employeeCreateSchema),
  employeeController.createEmployee
);

/**
 * @swagger
 * /employee/my/list:
 *   get:
 *     summary: Get list of employees for logged-in user
 *     tags: [Employee]
 *     description: Retrieve a paginated list of employees belonging to the authenticated user. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number (starts from 1)
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
 *         description: Employees retrieved successfully
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get(
  '/my/list',
  authenticate,
  employeeController.getMyEmployees
);

/**
 * @swagger
 * /employee/{id}:
 *   get:
 *     summary: Get employee by ID
 *     tags: [Employee]
 *     description: Retrieve an employee by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee retrieved successfully
 *       404:
 *         description: Employee not found
 */
router.get('/:id', employeeController.getEmployee);

/**
 * @swagger
 * /employee/{id}:
 *   patch:
 *     summary: Update employee details
 *     tags: [Employee]
 *     description: Update employee details. All fields are optional. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               role:
 *                 type: string
 *               mobileNo:
 *                 type: string
 *               email:
 *                 type: string
 *               sport:
 *                 type: string
 *               center:
 *                 type: string
 *               experience:
 *                 type: number
 *               workingHours:
 *                 type: string
 *               extraHours:
 *                 type: string
 *               certification:
 *                 type: array
 *               salary:
 *                 type: number
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *       400:
 *         description: Validation error or invalid data
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Employee not found
 *       409:
 *         description: Mobile number or email already exists
 */
router.patch(
  '/:id',
  authenticate,
  validate(employeeUpdateSchema),
  employeeController.updateEmployee
);

/**
 * @swagger
 * /employee/{id}/toggle-status:
 *   patch:
 *     summary: Toggle employee active status
 *     tags: [Employee]
 *     description: Toggle employee active/inactive status. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee status toggled successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Employee not found
 */
router.patch(
  '/:id/toggle-status',
  authenticate,
  employeeController.toggleEmployeeStatus
);

/**
 * @swagger
 * /employee/{id}:
 *   delete:
 *     summary: Delete employee (soft delete)
 *     tags: [Employee]
 *     description: Soft delete an employee by setting is_deleted to true. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Employee not found
 */
router.delete(
  '/:id',
  authenticate,
  employeeController.deleteEmployee
);

// Media upload routes for certifications
router.use('/media', employeeMediaRoutes);

export default router;

