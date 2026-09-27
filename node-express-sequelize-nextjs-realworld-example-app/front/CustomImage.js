"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("front/config");
// https://stackoverflow.com/questions/34097560/react-js-replace-img-src-onerror
// https://stackoverflow.com/questions/66949606/what-is-the-best-way-to-have-a-fallback-image-in-nextjs
const handleBrokenImage = (e) => {
    e.target.src = config_1.defaultProfileImage;
    e.target.onerror = null;
};
const CustomImage = ({ src, alt, className }) => {
    const classes = ['hide-text'];
    if (className) {
        classes.push(className);
    }
    return (<img {...{
        alt,
        src,
        onError: handleBrokenImage,
        className: classes.join(' '),
    }}/>);
};
exports.default = CustomImage;
//# sourceMappingURL=CustomImage.js.map