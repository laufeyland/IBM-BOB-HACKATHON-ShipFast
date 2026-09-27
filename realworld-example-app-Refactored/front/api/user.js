"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const config_1 = require("front/config");
const UserAPI = {
    current: async () => {
        const user = window.localStorage.getItem('user');
        const token = user?.token;
        try {
            const response = await axios_1.default.get(`/user`, {
                headers: {
                    Authorization: `Token ${encodeURIComponent(token)}`,
                },
            });
            return response;
        }
        catch (error) {
            return error.response;
        }
    },
    login: async (email, password) => {
        try {
            const response = await axios_1.default.post(`${config_1.apiPath}/users/login`, JSON.stringify({ user: { email, password } }), {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            return response;
        }
        catch (error) {
            return error.response;
        }
    },
    register: async (username, email, password) => {
        try {
            const response = await axios_1.default.post(`${config_1.apiPath}/users`, JSON.stringify({ user: { username, email, password } }), {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            return response;
        }
        catch (error) {
            return error.response;
        }
    },
    save: async (user) => {
        try {
            const response = await axios_1.default.put(`${config_1.apiPath}/user`, JSON.stringify({ user }), {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            return response;
        }
        catch (error) {
            return error.response;
        }
    },
    follow: async (username) => {
        const user = JSON.parse(window.localStorage.getItem('user'));
        const token = user?.token;
        try {
            const response = await axios_1.default.post(`${config_1.apiPath}/profiles/${username}/follow`, {}, {
                headers: {
                    Authorization: `Token ${encodeURIComponent(token)}`,
                },
            });
            return response;
        }
        catch (error) {
            return error.response;
        }
    },
    unfollow: async (username) => {
        const user = JSON.parse(window.localStorage.getItem('user'));
        const token = user?.token;
        try {
            const response = await axios_1.default.delete(`${config_1.apiPath}/profiles/${username}/follow`, {
                headers: {
                    Authorization: `Token ${encodeURIComponent(token)}`,
                },
            });
            return response;
        }
        catch (error) {
            return error.response;
        }
    },
    get: async (username) => {
        return axios_1.default.get(`${config_1.apiPath}/profiles/${username}`);
    },
};
exports.default = UserAPI;
//# sourceMappingURL=user.js.map