"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationController = void 0;
const apiResponse_1 = require("../../../../shared/src/utilities/apiResponse");
class OrganizationController {
    orgService;
    constructor(orgService) {
        this.orgService = orgService;
    }
    getProfile = async (req, res, next) => {
        try {
            const profile = await this.orgService.getCompanyProfile();
            (0, apiResponse_1.apiSuccess)(res, profile, 200);
        }
        catch (err) {
            next(err);
        }
    };
    updateProfile = async (req, res, next) => {
        try {
            const updated = await this.orgService.updateCompanyProfile(req.body);
            (0, apiResponse_1.apiSuccess)(res, updated, 200);
        }
        catch (err) {
            next(err);
        }
    };
    getBranches = async (req, res, next) => {
        try {
            const branches = await this.orgService.getBranches();
            (0, apiResponse_1.apiSuccess)(res, branches, 200);
        }
        catch (err) {
            next(err);
        }
    };
    createBranch = async (req, res, next) => {
        try {
            const branch = await this.orgService.createBranch(req.body);
            (0, apiResponse_1.apiSuccess)(res, branch, 201);
        }
        catch (err) {
            next(err);
        }
    };
    getDepartments = async (req, res, next) => {
        try {
            const departments = await this.orgService.getDepartments();
            (0, apiResponse_1.apiSuccess)(res, departments, 200);
        }
        catch (err) {
            next(err);
        }
    };
    createDepartment = async (req, res, next) => {
        try {
            const dept = await this.orgService.createDepartment(req.body);
            (0, apiResponse_1.apiSuccess)(res, dept, 201);
        }
        catch (err) {
            next(err);
        }
    };
    getDesignations = async (req, res, next) => {
        try {
            const designations = await this.orgService.getDesignations();
            (0, apiResponse_1.apiSuccess)(res, designations, 200);
        }
        catch (err) {
            next(err);
        }
    };
    createDesignation = async (req, res, next) => {
        try {
            const desig = await this.orgService.createDesignation(req.body);
            (0, apiResponse_1.apiSuccess)(res, desig, 201);
        }
        catch (err) {
            next(err);
        }
    };
    getDesignationCode = async (req, res, next) => {
        try {
            const designationId = req.query.designationId;
            const code = await this.orgService.deriveDesignationCode(designationId);
            (0, apiResponse_1.apiSuccess)(res, { code }, 200);
        }
        catch (err) {
            next(err);
        }
    };
}
exports.OrganizationController = OrganizationController;
