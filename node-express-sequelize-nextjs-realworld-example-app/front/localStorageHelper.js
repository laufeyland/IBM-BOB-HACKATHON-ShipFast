"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const localStorageHelper = (key) => {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
};
exports.default = localStorageHelper;
//# sourceMappingURL=localStorageHelper.js.map