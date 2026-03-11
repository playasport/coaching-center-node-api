import { Employee } from '../models/employee.model';
import type { EmployeeCreateInput, EmployeeUpdateInput } from '../validations/employee.validation';
export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}
export declare const createEmployee: (data: EmployeeCreateInput, _loggedInUserId: string) => Promise<Employee>;
export declare const getEmployeeById: (id: string) => Promise<Employee | null>;
export declare const getEmployeesByUser: (userId: string, page?: number, limit?: number) => Promise<PaginatedResult<Employee>>;
export declare const updateEmployee: (id: string, data: EmployeeUpdateInput, loggedInUserId: string) => Promise<Employee | null>;
export declare const toggleEmployeeStatus: (id: string, loggedInUserId: string) => Promise<Employee | null>;
export declare const deleteEmployee: (id: string, loggedInUserId: string) => Promise<void>;
//# sourceMappingURL=employee.service.d.ts.map