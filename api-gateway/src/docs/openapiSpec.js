"use strict";
/**
 * ORBYX HRMS - Centralized OpenAPI 3.0 Specification
 *
 * Accurately generated from existing microservices routes, Zod schemas,
 * RBAC permission requirements, and standard ApiResponse / AppError wrappers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.openapiSpec = void 0;
exports.openapiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'ORBYX HRMS API Documentation',
        version: '1.0.0',
        description: 'Centralized API Gateway and Microservices Documentation for ORBYX HRMS with zero-impact change control.',
        contact: {
            name: 'ORBYX HRMS Engineering',
        },
    },
    servers: [
        {
            url: '/',
            description: 'API Gateway Server',
        },
    ],
    tags: [
        { name: 'Gateway', description: 'API Gateway Health & Diagnostic endpoints' },
        { name: 'Auth Service', description: 'Authentication, session management, user registration, and RBAC profile' },
        { name: 'Organization Service', description: 'Company profile, branches, departments, and designations hierarchy' },
        { name: 'Employee Service', description: 'Employee onboarding (draft & enroll), personal, employment, reporting, and salary/bank management' },
        { name: 'Attendance & Leave Service', description: 'Clock-in/out, biometric punches, regularizations, leave requests, reviews, and payroll summaries' },
        { name: 'Payroll Service', description: 'Monthly payroll runs execution and calculations' },
        { name: 'Expense Service', description: 'Expense claims submission, manager review, and HR disbursement' },
        { name: 'Asset Service', description: 'Hardware/software asset catalog, employee allocations, acknowledgment, and return' },
        { name: 'Client Service', description: 'External client deployments, attendance verifications, and client-supervisor approvals' },
        { name: 'Notification & Audit Service', description: 'In-app notifications, unread counts, status updates, and compliance audit trail' },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Provide your JWT bearer token in the format: `Bearer <token>`',
            },
        },
        schemas: {
            ApiResponseSuccess: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'object', nullable: true },
                    meta: {
                        type: 'object',
                        properties: {
                            correlationId: { type: 'string', example: 'c9f6d4d1-4475-4c07-9b7e-913a48e71c50' },
                            timestamp: { type: 'string', format: 'date-time' },
                            total: { type: 'integer' },
                            page: { type: 'integer' },
                            limit: { type: 'integer' },
                        },
                    },
                },
            },
            ApiResponseError: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    error: {
                        type: 'object',
                        properties: {
                            code: { type: 'string', example: 'VALIDATION_ERROR' },
                            message: { type: 'string', example: 'Invalid request payload' },
                            details: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        field: { type: 'string' },
                                        message: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    meta: {
                        type: 'object',
                        properties: {
                            correlationId: { type: 'string', example: 'c9f6d4d1-4475-4c07-9b7e-913a48e71c50' },
                            timestamp: { type: 'string', format: 'date-time' },
                        },
                    },
                },
            },
        },
        responses: {
            Unauthorized: {
                description: '401 Unauthorized - Missing or invalid JWT Bearer token',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ApiResponseError' },
                        example: {
                            success: false,
                            error: { code: 'UNAUTHORIZED', message: 'Authentication required. No Bearer token provided or token invalid.' },
                        },
                    },
                },
            },
            Forbidden: {
                description: '403 Forbidden - Caller does not possess the required RBAC permission',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ApiResponseError' },
                        example: {
                            success: false,
                            error: { code: 'FORBIDDEN', message: 'You lack the required permission to perform this action.' },
                        },
                    },
                },
            },
            NotFound: {
                description: '404 Not Found - Requested entity does not exist',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ApiResponseError' },
                        example: {
                            success: false,
                            error: { code: 'NOT_FOUND', message: 'Resource not found' },
                        },
                    },
                },
            },
            ValidationError: {
                description: '400 Bad Request - Payload failed Zod schema validation',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ApiResponseError' },
                        example: {
                            success: false,
                            error: {
                                code: 'VALIDATION_ERROR',
                                message: 'Invalid input parameters',
                                details: [{ field: 'email', message: 'Invalid email address' }],
                            },
                        },
                    },
                },
            },
            ServerError: {
                description: '500 Internal Server Error',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ApiResponseError' },
                        example: {
                            success: false,
                            error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected internal error occurred' },
                        },
                    },
                },
            },
        },
    },
    paths: {
        // -------------------------------------------------------------
        // GATEWAY
        // -------------------------------------------------------------
        '/health': {
            get: {
                tags: ['Gateway'],
                summary: 'Gateway Health Check',
                description: 'Returns the health status of the API Gateway and attached downstream routes.',
                responses: {
                    '200': {
                        description: 'Gateway is healthy and operational',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'UP' },
                                        gateway: { type: 'string', example: 'api-gateway' },
                                        timestamp: { type: 'string', format: 'date-time' },
                                        routes: { type: 'array', items: { type: 'string' } },
                                        services: { type: 'object' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        // -------------------------------------------------------------
        // AUTH SERVICE
        // -------------------------------------------------------------
        '/api/v1/auth/login': {
            post: {
                tags: ['Auth Service'],
                summary: 'Authenticate User',
                description: 'Validates user credentials and issues an Access Token & Refresh Token pair.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password'],
                                properties: {
                                    email: { type: 'string', format: 'email', example: 'admin@orbyx.local' },
                                    password: { type: 'string', format: 'password', example: 'AdminSecurePass123!' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Authentication successful',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiResponseSuccess' },
                            },
                        },
                    },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                },
            },
        },
        '/api/v1/auth/refresh': {
            post: {
                tags: ['Auth Service'],
                summary: 'Refresh Access Token',
                description: 'Exchanges a valid refresh token for a new short-lived access token.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['refreshToken'],
                                properties: {
                                    refreshToken: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'New token pair issued', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponseSuccess' } } } },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                },
            },
        },
        '/api/v1/auth/logout': {
            post: {
                tags: ['Auth Service'],
                summary: 'Logout and Revoke Session',
                description: 'Invalidates active authentication session and tokens.',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': { description: 'Logged out successfully' },
                },
            },
        },
        '/api/v1/auth/register': {
            post: {
                tags: ['Auth Service'],
                summary: 'Register New User (Administrative)',
                description: 'Administrative creation of user account with specific initial role.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `auth.users.manage`',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password', 'roleName'],
                                properties: {
                                    email: { type: 'string', format: 'email' },
                                    password: { type: 'string', minLength: 8 },
                                    roleName: { type: 'string', example: 'employee' },
                                    employeeId: { type: 'string', format: 'uuid', nullable: true },
                                    tenantId: { type: 'string', nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'User account created successfully' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/auth/me': {
            get: {
                tags: ['Auth Service'],
                summary: 'Get Current Authenticated Identity',
                description: 'Retrieves claims, roles, employee reference, and granted permissions for current token.',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': { description: 'Current identity returned' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                },
            },
        },
        // -------------------------------------------------------------
        // ORGANIZATION SERVICE
        // -------------------------------------------------------------
        '/api/v1/organization/profile': {
            get: {
                tags: ['Organization Service'],
                summary: 'Get Company Profile',
                description: 'Retrieves organizational profile, legal entity names, addresses, and registration numbers.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `org.profile.read`',
                responses: {
                    '200': { description: 'Company profile returned' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
            put: {
                tags: ['Organization Service'],
                summary: 'Update Company Profile',
                description: 'Updates corporate branding, legal names, tax registrations, or statutory info.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `org.profile.manage`',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    legalName: { type: 'string' },
                                    tradeName: { type: 'string' },
                                    cin: { type: 'string' },
                                    pan: { type: 'string' },
                                    gstin: { type: 'string' },
                                    officialEmail: { type: 'string', format: 'email' },
                                    officialPhone: { type: 'string' },
                                    website: { type: 'string', format: 'uri' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Company profile updated' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/organization/branches': {
            get: {
                tags: ['Organization Service'],
                summary: 'List Branches',
                description: 'Lists all physical operating branch offices and locations.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `org.profile.read`',
                responses: {
                    '200': { description: 'Branches retrieved successfully' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
            post: {
                tags: ['Organization Service'],
                summary: 'Create Branch Location',
                description: 'Creates a new company branch location.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `org.branches.manage`',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['branchCode', 'branchName', 'city', 'state', 'country'],
                                properties: {
                                    branchCode: { type: 'string' },
                                    branchName: { type: 'string' },
                                    addressLine1: { type: 'string' },
                                    city: { type: 'string' },
                                    state: { type: 'string' },
                                    country: { type: 'string' },
                                    postalCode: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Branch created' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/organization/departments': {
            get: {
                tags: ['Organization Service'],
                summary: 'List Departments',
                description: 'Retrieves all functional corporate departments.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `org.profile.read`',
                responses: {
                    '200': { description: 'Departments retrieved' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
            post: {
                tags: ['Organization Service'],
                summary: 'Create Department',
                description: 'Defines a new department unit.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `org.departments.manage`',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['departmentCode', 'departmentName'],
                                properties: {
                                    departmentCode: { type: 'string' },
                                    departmentName: { type: 'string' },
                                    parentDepartmentId: { type: 'string', format: 'uuid', nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Department created' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/organization/designations': {
            get: {
                tags: ['Organization Service'],
                summary: 'List Designations',
                description: 'Lists all organizational titles, bands, and levels.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `org.profile.read`',
                responses: {
                    '200': { description: 'Designations retrieved' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
            post: {
                tags: ['Organization Service'],
                summary: 'Create Designation',
                description: 'Creates a new designation/title band.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `org.designations.manage`',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['designationCode', 'designationTitle'],
                                properties: {
                                    designationCode: { type: 'string' },
                                    designationTitle: { type: 'string' },
                                    level: { type: 'integer', default: 1 },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Designation created' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/organization/designations/derive-code': {
            get: {
                tags: ['Organization Service'],
                summary: 'Derive Next Designation Code',
                description: 'Auto-computes sequential code for new designation creations.',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': { description: 'Derived code returned' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                },
            },
        },
        // -------------------------------------------------------------
        // EMPLOYEE SERVICE
        // -------------------------------------------------------------
        '/api/v1/employees': {
            get: {
                tags: ['Employee Service'],
                summary: 'List Employees Directory',
                description: 'Retrieves employees with pagination and filters. Sensitive fields redacted depending on scope.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `employee.directory.read_basic`',
                parameters: [
                    { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                    { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
                    { name: 'departmentId', in: 'query', schema: { type: 'string' } },
                    { name: 'branchId', in: 'query', schema: { type: 'string' } },
                    { name: 'status', in: 'query', schema: { type: 'string' } },
                ],
                responses: {
                    '200': { description: 'Employee directory list' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/employees/{id}': {
            get: {
                tags: ['Employee Service'],
                summary: 'Get Employee Profile by ID',
                description: 'Returns employee details. Sensitive salary/banking info is masked unless caller has HR permissions.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `employee.directory.read_basic`',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                ],
                responses: {
                    '200': { description: 'Employee profile retrieved' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                    '404': { $ref: '#/components/responses/NotFound' },
                },
            },
        },
        '/api/v1/employees/draft': {
            post: {
                tags: ['Employee Service'],
                summary: 'Create Employee Onboarding Draft',
                description: 'Allows saving partial employee data during early onboarding workflow.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `employee.profile.edit_employment`',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['firstName', 'lastName', 'personalEmail'],
                                properties: {
                                    firstName: { type: 'string' },
                                    lastName: { type: 'string' },
                                    personalEmail: { type: 'string', format: 'email' },
                                    phone: { type: 'string' },
                                    departmentId: { type: 'string' },
                                    designationId: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Draft created' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/employees/enroll': {
            post: {
                tags: ['Employee Service'],
                summary: 'Complete Employee Enrollment',
                description: 'Finalizes onboarding, validates mandatory statutory fields, and generates unique Employee ID.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `employee.profile.edit_employment`',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['draftId', 'dateOfJoining', 'branchId', 'departmentId', 'designationId'],
                                properties: {
                                    draftId: { type: 'string', format: 'uuid' },
                                    dateOfJoining: { type: 'string', format: 'date' },
                                    branchId: { type: 'string', format: 'uuid' },
                                    departmentId: { type: 'string', format: 'uuid' },
                                    designationId: { type: 'string', format: 'uuid' },
                                    reportingManagerId: { type: 'string', format: 'uuid', nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Employee successfully enrolled' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/employees/{id}/personal': {
            put: {
                tags: ['Employee Service'],
                summary: 'Update Personal Details',
                description: 'Allows employee self-update or HR update of phone, address, and emergency details.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permissions: `employee.profile.update_self` OR `employee.profile.edit_personal`',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    phone: { type: 'string' },
                                    maritalStatus: { type: 'string' },
                                    bloodGroup: { type: 'string' },
                                    currentAddress: { type: 'string' },
                                    permanentAddress: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Personal details updated' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/employees/{id}/employment': {
            put: {
                tags: ['Employee Service'],
                summary: 'Update Employment Details',
                description: 'Updates job category, branch, department, and employment status. Restricted to HR.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `employee.profile.edit_employment`',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    branchId: { type: 'string' },
                                    departmentId: { type: 'string' },
                                    designationId: { type: 'string' },
                                    employmentType: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Employment details updated' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/employees/{id}/reporting': {
            put: {
                tags: ['Employee Service'],
                summary: 'Update Reporting Hierarchy',
                description: 'Updates primary manager or functional manager.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `employee.profile.edit_reporting`',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['reportingManagerId'],
                                properties: {
                                    reportingManagerId: { type: 'string', format: 'uuid' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Reporting manager updated' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/employees/{id}/salary-bank': {
            put: {
                tags: ['Employee Service'],
                summary: 'Update Salary & Bank Account Details',
                description: 'Updates bank account number, IFSC, and salary structure mapping. Strictly restricted to HR Admin.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permissions: `employee.salary.edit` AND `employee.bank_details.edit`',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    bankName: { type: 'string' },
                                    accountNumber: { type: 'string' },
                                    ifscCode: { type: 'string' },
                                    panNumber: { type: 'string' },
                                    baseSalary: { type: 'number' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Salary & bank updated' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        // -------------------------------------------------------------
        // ATTENDANCE & LEAVE SERVICE
        // -------------------------------------------------------------
        '/api/v1/attendance/punch': {
            post: {
                tags: ['Attendance & Leave Service'],
                summary: 'Clock-in / Clock-out Punch',
                description: 'Records geo-tagged biometric or web attendance punch for authenticated employee.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `attendance.punch_self`',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['type'],
                                properties: {
                                    type: { type: 'string', enum: ['IN', 'OUT'] },
                                    latitude: { type: 'number', nullable: true },
                                    longitude: { type: 'number', nullable: true },
                                    deviceId: { type: 'string', nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Punch recorded' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/attendance/regularize': {
            post: {
                tags: ['Attendance & Leave Service'],
                summary: 'Submit Attendance Regularization Request',
                description: 'Employee request to correct a missed punch or biometric failure.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `attendance.regularize_self`',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['date', 'punchIn', 'punchOut', 'reason'],
                                properties: {
                                    date: { type: 'string', format: 'date' },
                                    punchIn: { type: 'string' },
                                    punchOut: { type: 'string' },
                                    reason: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Regularization request submitted' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/attendance/regularize/{id}/review': {
            put: {
                tags: ['Attendance & Leave Service'],
                summary: 'Review Attendance Regularization',
                description: 'Manager or HR review to approve or reject a regularization request.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permissions: `attendance.approve_team` OR `attendance.approve_all`',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['status'],
                                properties: {
                                    status: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
                                    rejectionReason: { type: 'string', nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Regularization review completed' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/attendance/leaves/apply': {
            post: {
                tags: ['Attendance & Leave Service'],
                summary: 'Submit Leave Application',
                description: 'Submits a leave request against available leave balances.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `leave.apply_self`',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['leaveTypeId', 'startDate', 'endDate', 'reason'],
                                properties: {
                                    leaveTypeId: { type: 'string', format: 'uuid' },
                                    startDate: { type: 'string', format: 'date' },
                                    endDate: { type: 'string', format: 'date' },
                                    reason: { type: 'string' },
                                    halfDay: { type: 'boolean', default: false },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Leave application submitted' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/attendance/leaves/{id}/review': {
            put: {
                tags: ['Attendance & Leave Service'],
                summary: 'Review Leave Application',
                description: 'Manager or HR review (approval or rejection) of pending employee leave.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permissions: `leave.approve_team` OR `leave.approve_all`',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['status'],
                                properties: {
                                    status: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
                                    comment: { type: 'string', nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Leave application reviewed' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/attendance/internal/payroll-summary': {
            get: {
                tags: ['Attendance & Leave Service'],
                summary: 'Get Attendance Payroll Summary (Internal)',
                description: 'Computes payable days, present days, and loss of pay (LOP) for monthly payroll processing.',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'month', in: 'query', required: true, schema: { type: 'integer' } },
                    { name: 'year', in: 'query', required: true, schema: { type: 'integer' } },
                ],
                responses: {
                    '200': { description: 'Attendance summary returned' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                },
            },
        },
        // -------------------------------------------------------------
        // PAYROLL SERVICE
        // -------------------------------------------------------------
        '/api/v1/payroll/runs': {
            post: {
                tags: ['Payroll Service'],
                summary: 'Initiate Monthly Payroll Run',
                description: 'Initiates payroll calculation run for the given pay period and branch/org.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permissions: `payroll.process` AND `payroll.run.execute`',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['month', 'year'],
                                properties: {
                                    month: { type: 'integer', minimum: 1, maximum: 12 },
                                    year: { type: 'integer' },
                                    branchId: { type: 'string', nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Payroll run initiated' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        // -------------------------------------------------------------
        // EXPENSE SERVICE
        // -------------------------------------------------------------
        '/api/v1/expenses/claims': {
            post: {
                tags: ['Expense Service'],
                summary: 'Submit Expense Claim',
                description: 'Employee submission of reimbursement claim with expense receipts.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `expenses.claim_self`',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['categoryId', 'amount', 'expenseDate', 'description'],
                                properties: {
                                    categoryId: { type: 'string', format: 'uuid' },
                                    amount: { type: 'number', minimum: 0.01 },
                                    expenseDate: { type: 'string', format: 'date' },
                                    description: { type: 'string' },
                                    receiptUrl: { type: 'string', format: 'uri', nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Expense claim submitted' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/expenses/claims/{id}/manager-review': {
            put: {
                tags: ['Expense Service'],
                summary: 'Manager Review Expense Claim',
                description: 'Approves or rejects team member expense claim at manager tier.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permissions: `expenses.approve_team` OR `expenses.approve_all`',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['status'],
                                properties: {
                                    status: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
                                    comment: { type: 'string', nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Claim status updated' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/expenses/claims/{id}/hr-approve': {
            put: {
                tags: ['Expense Service'],
                summary: 'HR / Finance Final Expense Approval & Disbursement',
                description: 'Final organizational approval to release expense claim for reimbursement.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `expenses.approve_all`',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['status'],
                                properties: {
                                    status: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
                                    comment: { type: 'string', nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Claim approved for disbursement' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        // -------------------------------------------------------------
        // ASSET SERVICE
        // -------------------------------------------------------------
        '/api/v1/assets': {
            post: {
                tags: ['Asset Service'],
                summary: 'Register Asset',
                description: 'Adds a new hardware asset or software license to company inventory.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `assets.administer`',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name', 'category', 'assetTag'],
                                properties: {
                                    name: { type: 'string' },
                                    category: { type: 'string', enum: ['HARDWARE', 'SOFTWARE'] },
                                    assetTag: { type: 'string' },
                                    serialNumber: { type: 'string', nullable: true },
                                    cost: { type: 'number', nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Asset registered' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/assets/allocate': {
            post: {
                tags: ['Asset Service'],
                summary: 'Allocate Asset to Employee',
                description: 'Assigns an asset to an employee with allocation condition notes.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `assets.administer`',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['assetId', 'employeeId'],
                                properties: {
                                    assetId: { type: 'string', format: 'uuid' },
                                    employeeId: { type: 'string', format: 'uuid' },
                                    notes: { type: 'string', nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Asset allocated' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/assets/{id}/acknowledge': {
            post: {
                tags: ['Asset Service'],
                summary: 'Acknowledge Asset Receipt (Employee)',
                description: 'Employee formally acknowledges possession and condition of assigned asset.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `assets.acknowledge_self`',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    '200': { description: 'Asset receipt acknowledged' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/assets/{id}/return': {
            post: {
                tags: ['Asset Service'],
                summary: 'Return Asset',
                description: 'Records return of an asset, return condition, and restores inventory.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `assets.administer`',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['returnCondition'],
                                properties: {
                                    returnCondition: { type: 'string' },
                                    remarks: { type: 'string', nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Asset returned' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        // -------------------------------------------------------------
        // CLIENT SERVICE
        // -------------------------------------------------------------
        '/api/v1/clients/verifications/{id}/verify': {
            put: {
                tags: ['Client Service'],
                summary: 'Verify Deployed Attendance (Client Supervisor)',
                description: 'Client supervisor reviews and signs off attendance for staff deployed at client premises.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `client.attendance.verify_deployed`',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['verifiedDays', 'status'],
                                properties: {
                                    verifiedDays: { type: 'number' },
                                    status: { type: 'string', enum: ['VERIFIED', 'DISPUTED'] },
                                    notes: { type: 'string', nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Attendance verified' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/clients/verifications/{id}/hr-approve': {
            put: {
                tags: ['Client Service'],
                summary: 'Resolve / Approve Client Verification (HR)',
                description: 'HR Admin approves verified attendance or resolves client disputes.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `client.verification.hr_resolve`',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['status'],
                                properties: {
                                    status: { type: 'string', enum: ['RESOLVED', 'REJECTED'] },
                                    resolutionNotes: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Verification resolved' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
        '/api/v1/clients/internal/payroll-verification': {
            get: {
                tags: ['Client Service'],
                summary: 'Get Client-Verified Attendance for Payroll (Internal)',
                description: 'Calculates verified billable client days for external deployment payroll runs.',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'month', in: 'query', required: true, schema: { type: 'integer' } },
                    { name: 'year', in: 'query', required: true, schema: { type: 'integer' } },
                ],
                responses: {
                    '200': { description: 'Verified days summary returned' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                },
            },
        },
        // -------------------------------------------------------------
        // NOTIFICATION & AUDIT SERVICE
        // -------------------------------------------------------------
        '/api/v1/notifications/dispatch': {
            post: {
                tags: ['Notification & Audit Service'],
                summary: 'Dispatch Notification (Internal)',
                description: 'Creates and delivers an in-app, email, or push notification to recipient.',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['recipientId', 'title', 'message'],
                                properties: {
                                    recipientId: { type: 'string' },
                                    title: { type: 'string' },
                                    message: { type: 'string' },
                                    type: { type: 'string', default: 'INFO' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Notification dispatched' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                },
            },
        },
        '/api/v1/notifications/my': {
            get: {
                tags: ['Notification & Audit Service'],
                summary: 'Get My Notifications',
                description: 'Lists all recent notifications for the authenticated user.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Requires authenticated JWT identity',
                responses: {
                    '200': { description: 'User notifications list' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                },
            },
        },
        '/api/v1/notifications/my/unread-count': {
            get: {
                tags: ['Notification & Audit Service'],
                summary: 'Get My Unread Notification Count',
                description: 'Returns count of unread notifications for badge rendering.',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': { description: 'Unread notification count returned' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                },
            },
        },
        '/api/v1/notifications/{id}/read': {
            patch: {
                tags: ['Notification & Audit Service'],
                summary: 'Mark Notification as Read',
                description: 'Updates notification state to read for authenticated recipient.',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    '200': { description: 'Marked as read' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                },
            },
        },
        '/api/v1/notifications/read-all': {
            post: {
                tags: ['Notification & Audit Service'],
                summary: 'Mark All Notifications as Read',
                description: 'Marks all unread notifications as read for current user.',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': { description: 'All marked as read' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                },
            },
        },
        '/api/v1/audit/logs': {
            post: {
                tags: ['Notification & Audit Service'],
                summary: 'Create Audit Log (Internal)',
                description: 'Records an audit event in compliance history.',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['serviceName', 'action', 'resourceType', 'actorId'],
                                properties: {
                                    serviceName: { type: 'string' },
                                    action: { type: 'string' },
                                    resourceType: { type: 'string' },
                                    actorId: { type: 'string' },
                                    resourceId: { type: 'string', nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Audit log recorded' },
                    '400': { $ref: '#/components/responses/ValidationError' },
                },
            },
            get: {
                tags: ['Notification & Audit Service'],
                summary: 'Query Audit Logs',
                description: 'Audits access records and compliance logs. Strictly restricted to compliance & super admins.',
                security: [{ bearerAuth: [] }],
                description_rbac: 'Required permission: `audit.logs.read_all` (or `audit:read`)',
                parameters: [
                    { name: 'serviceName', in: 'query', schema: { type: 'string' } },
                    { name: 'action', in: 'query', schema: { type: 'string' } },
                    { name: 'actorId', in: 'query', schema: { type: 'string' } },
                ],
                responses: {
                    '200': { description: 'Audit records list' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                },
            },
        },
    },
};
