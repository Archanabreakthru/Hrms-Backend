"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientController = void 0;
const apiResponse_1 = require("../../../../shared/src/utilities/apiResponse");
class ClientController {
    clientService;
    constructor(clientService) {
        this.clientService = clientService;
    }
    supervisorVerify = async (req, res, next) => {
        try {
            const { decision, remarks } = req.body;
            const verif = await this.clientService.supervisorVerify(req.params.id, decision, remarks, req.user);
            (0, apiResponse_1.apiSuccess)(res, verif, 200);
        }
        catch (err) {
            next(err);
        }
    };
    hrResolveAndApprove = async (req, res, next) => {
        try {
            const { decision, hrComments } = req.body;
            const verif = await this.clientService.hrResolveAndApprove(req.params.id, decision, hrComments, req.user);
            (0, apiResponse_1.apiSuccess)(res, verif, 200);
        }
        catch (err) {
            next(err);
        }
    };
    getPayrollVerificationSummary = async (req, res, next) => {
        try {
            const { employeeId, periodKey } = req.query;
            const summary = await this.clientService.getVerifiedHoursAndAllowancesForPayroll(employeeId, periodKey);
            (0, apiResponse_1.apiSuccess)(res, summary, 200);
        }
        catch (err) {
            next(err);
        }
    };
}
exports.ClientController = ClientController;
