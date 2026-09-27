"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = useLoggedInUser;
const swr_1 = __importDefault(require("swr"));
const front_1 = require("front");
const checkLogin_1 = __importDefault(require("front/checkLogin"));
const localStorageHelper_1 = __importDefault(require("front/localStorageHelper"));
function useLoggedInUser() {
    const { data: authCookie } = (0, swr_1.default)('auth/cookie', () => {
        const ret = (0, front_1.getCookie)(front_1.AUTH_COOKIE_NAME);
        if (!ret) {
            // E.g. if the test database was nuked, the GET request sees wrong auth,
            // and removes the cookie with a HEADER. And now here we noticed that on
            // the JavaSript, so we get rid of it. Notably, this removes the logged in
            // user from the navbar.
            //
            // This also happens if a user account is rotated on the demo database,
            // and the user comes back some time later.
            window.localStorage.removeItem(front_1.AUTH_LOCAL_STORAGE_NAME);
        }
        return ret;
    });
    const { data: loggedInUser } = (0, swr_1.default)(() => (authCookie ? 'user' : null), localStorageHelper_1.default);
    if (loggedInUser === undefined)
        return loggedInUser;
    const isLoggedIn = (0, checkLogin_1.default)(loggedInUser);
    if (isLoggedIn) {
        return loggedInUser;
    }
    else {
        return null;
    }
}
//# sourceMappingURL=useLoggedInUser.js.map