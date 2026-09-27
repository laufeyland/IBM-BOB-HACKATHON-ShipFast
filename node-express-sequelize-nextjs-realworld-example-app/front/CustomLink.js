"use strict";
/* Helper for a link that accepts parameters such as className */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const link_1 = __importDefault(require("next/link"));
const react_1 = __importDefault(require("react"));
const CustomLink = ({ className, href, onClick, children, shallow, }) => {
    if (shallow === undefined) {
        shallow = false;
    }
    return (<link_1.default href={href} passHref shallow={shallow}>
      <a onClick={onClick} className={className || ''}>
        {children}
      </a>
    </link_1.default>);
};
exports.default = CustomLink;
//# sourceMappingURL=CustomLink.js.map