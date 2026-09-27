"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const models = require('./models');
// TODO sync. But we have to stop the server
// before listen for that. Don't know how to do it.
const sequelize = models.getSequelize(path_1.default.join(process.cwd()));
exports.default = sequelize;
//# sourceMappingURL=db.js.map