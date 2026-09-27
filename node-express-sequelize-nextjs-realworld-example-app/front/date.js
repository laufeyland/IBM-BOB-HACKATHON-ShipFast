"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = formatDate;
function formatDate(dateString) {
    const date = new Date(dateString);
    const month = date.toLocaleString('default', { month: 'long' });
    return `${month} ${date.getDate()}, ${date.getFullYear()}`;
}
//# sourceMappingURL=date.js.map