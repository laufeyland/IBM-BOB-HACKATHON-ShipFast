"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const config_1 = require("front/config");
const getQuery = (limit, page) => `limit=${limit}&offset=${page ? page * limit : 0}`;
const ArticleAPI = {
    all: (page, limit = 10) => axios_1.default.get(`${config_1.apiPath}/articles?${getQuery(limit, page)}`),
    byAuthor: (author, page = 0, limit = 5) => axios_1.default.get(`${config_1.apiPath}/articles?author=${encodeURIComponent(author)}&${getQuery(limit, page)}`),
    byTag: (tag, page = 0, limit = 10) => axios_1.default.get(`${config_1.apiPath}/articles?tag=${encodeURIComponent(tag)}&${getQuery(limit, page)}`),
    delete: (id, token) => axios_1.default.delete(`${config_1.apiPath}/articles/${id}`, {
        headers: {
            Authorization: `Token ${token}`,
        },
    }),
    favorite: (slug) => axios_1.default.post(`${config_1.apiPath}/articles/${slug}/favorite`),
    favoritedBy: (author, page) => axios_1.default.get(`${config_1.apiPath}/articles?favorited=${encodeURIComponent(author)}&${getQuery(10, page)}`),
    feed: (page, limit = 10) => axios_1.default.get(`${config_1.apiPath}/articles/feed?${getQuery(limit, page)}`),
    get: (slug) => axios_1.default.get(`${config_1.apiPath}/articles/${encodeURIComponent(slug)}`),
    unfavorite: (slug) => axios_1.default.delete(`${config_1.apiPath}/articles/${slug}/favorite`),
    update: async (article, pid, token) => {
        const { data, status } = await axios_1.default.put(`${config_1.apiPath}/articles/${pid}`, JSON.stringify({ article }), {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Token ${encodeURIComponent(token)}`,
            },
        });
        return {
            data,
            status,
        };
    },
    create: async (article, token) => {
        const { data, status } = await axios_1.default.post(`${config_1.apiPath}/articles`, JSON.stringify({ article }), {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Token ${encodeURIComponent(token)}`,
            },
        });
        return {
            data,
            status,
        };
    },
};
exports.default = ArticleAPI;
//# sourceMappingURL=article.js.map