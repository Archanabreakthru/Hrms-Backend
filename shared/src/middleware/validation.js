"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = validateRequest;
const zod_1 = require("zod");
const AppError_1 = require("../errors/AppError");
function validateRequest(schema) {
    return (req, res, next) => {
        try {
            if (schema.body) {
                req.body = schema.body.parse(req.body);
            }
            if (schema.query) {
                req.query = schema.query.parse(req.query);
            }
            if (schema.params) {
                req.params = schema.params.parse(req.params);
            }
            next();
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                const issues = err.issues.map((issue) => ({
                    path: issue.path.join('.'),
                    message: issue.message,
                }));
                return next(new AppError_1.ValidationError('Request validation failed', issues));
            }
            next(err);
        }
    };
}
