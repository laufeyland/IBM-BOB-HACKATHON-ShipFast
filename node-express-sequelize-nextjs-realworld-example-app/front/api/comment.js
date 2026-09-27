"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const config_1 = require("front/config");
const CommentAPI = {
    create: async (slug, comment) => {
        try {
            const response = await axios_1.default.post(`${config_1.apiPath}/articles/${slug}/comments`, JSON.stringify({ comment }));
            return response;
        }
        catch (error) {
            return error.response;
        }
    },
    delete: async (slug, commentId) => {
        try {
            const response = await axios_1.default.delete(`${config_1.apiPath}/articles/${slug}/comments/${commentId}`);
            return response;
        }
        catch (error) {
            return error.response;
        }
    },
    forArticle: (slug) => axios_1.default.get(`${config_1.apiPath}/articles/${slug}/comments`),
};
exports.default = CommentAPI;
//# sourceMappingURL=comment.js.map