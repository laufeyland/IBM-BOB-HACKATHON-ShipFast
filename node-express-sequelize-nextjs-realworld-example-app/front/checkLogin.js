"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const checkLogin = (loggedInUser) => !!loggedInUser &&
    loggedInUser?.constructor === Object &&
    Object.keys(loggedInUser).length !== 0;
exports.default = checkLogin;
//# sourceMappingURL=checkLogin.js.map