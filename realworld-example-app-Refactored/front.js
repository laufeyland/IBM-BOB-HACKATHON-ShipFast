"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTH_LOCAL_STORAGE_NAME = exports.AUTH_COOKIE_NAME = void 0;
exports.setCookie = setCookie;
exports.setCookies = setCookies;
exports.getCookie = getCookie;
exports.getCookieFromReq = getCookieFromReq;
exports.getCookieFromString = getCookieFromString;
exports.getCookiesFromString = getCookiesFromString;
exports.deleteCookie = deleteCookie;
exports.setupUserLocalStorage = setupUserLocalStorage;
const user_1 = __importDefault(require("front/api/user"));
const swr_1 = require("swr");
exports.AUTH_COOKIE_NAME = 'auth';
exports.AUTH_LOCAL_STORAGE_NAME = 'user';
// https://stackoverflow.com/questions/4825683/how-do-i-create-and-read-a-value-from-cookie/38699214#38699214
function setCookie(name, value, days, path = '/') {
    let delta;
    if (days === undefined) {
        delta = Number.MAX_SAFE_INTEGER;
    }
    else {
        delta = days * 864e5;
    }
    const expires = new Date(Date.now() + delta).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=${path}`;
}
function setCookies(cookieDict, days, path = '/') {
    for (const key in cookieDict) {
        setCookie(key, cookieDict[key], days, path);
    }
}
function getCookie(name) {
    return getCookieFromString(document.cookie, name);
}
function getCookieFromReq(req, name) {
    const cookie = req.headers.cookie;
    if (cookie) {
        return getCookieFromString(cookie, name);
    }
    else {
        return null;
    }
}
function getCookieFromString(s, name) {
    return getCookiesFromString(s)[name];
}
// https://stackoverflow.com/questions/5047346/converting-strings-like-document-cookie-to-objects
function getCookiesFromString(s) {
    return s.split('; ').reduce((prev, current) => {
        const [name, ...value] = current.split('=');
        prev[name] = value.join('=');
        return prev;
    }, {});
}
function deleteCookie(name, path = '/') {
    setCookie(name, '', -1, path);
}
async function setupUserLocalStorage(data, setErrors) {
    // We fetch from /profiles/:username again because the return from /users/login above
    // does not contain the image placeholder.
    const { data: profileData, status: profileStatus } = await user_1.default.get(data.user.username);
    if (profileStatus !== 200) {
        setErrors(profileData.errors);
    }
    data.user.effectiveImage = profileData.profile.image;
    window.localStorage.setItem(exports.AUTH_LOCAL_STORAGE_NAME, JSON.stringify(data.user));
    setCookie(exports.AUTH_COOKIE_NAME, data.user.token);
    (0, swr_1.mutate)(exports.AUTH_LOCAL_STORAGE_NAME, data.user);
}
//# sourceMappingURL=front.js.map