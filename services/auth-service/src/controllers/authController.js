"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const apiResponse_1 = require("../../../../shared/src/utilities/apiResponse");
class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    login = async (req, res, next) => {
        try {
            const { email, password } = req.body;
            const userAgent = req.headers['user-agent'];
            const ipAddress = req.ip || req.socket.remoteAddress;
            const result = await this.authService.login(email, password, { userAgent, ipAddress });
            (0, apiResponse_1.apiSuccess)(res, result, 200);
        }
        catch (err) {
            next(err);
        }
    };
    refresh = async (req, res, next) => {
        try {
            const { refreshToken } = req.body;
            const result = await this.authService.refresh(refreshToken);
            (0, apiResponse_1.apiSuccess)(res, result, 200);
        }
        catch (err) {
            next(err);
        }
    };
    logout = async (req, res, next) => {
        try {
            const { refreshToken } = req.body;
            if (refreshToken) {
                await this.authService.logout(refreshToken);
            }
            (0, apiResponse_1.apiSuccess)(res, { message: 'Logged out successfully' }, 200);
        }
        catch (err) {
            next(err);
        }
    };
    register = async (req, res, next) => {
        try {
            const result = await this.authService.register(req.body, req.user);
            (0, apiResponse_1.apiSuccess)(res, result, 201);
        }
        catch (err) {
            next(err);
        }
    };
    me = async (req, res, next) => {
        try {
            (0, apiResponse_1.apiSuccess)(res, req.user, 200);
        }
        catch (err) {
            next(err);
        }
    };
}
exports.AuthController = AuthController;
