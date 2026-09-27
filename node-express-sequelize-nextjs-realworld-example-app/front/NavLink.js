"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const link_1 = __importDefault(require("next/link"));
const router_1 = require("next/router");
const NavLink = ({ href, onClick, children }) => {
    const router = (0, router_1.useRouter)();
    const { asPath } = router;
    return (<link_1.default href={href} passHref>
      <a onClick={onClick} className={`${(encodeURIComponent(asPath) === encodeURIComponent(href) &&
            'active ') ||
            ''}nav-link`}>
        {children}
      </a>
    </link_1.default>);
};
exports.default = NavLink;
//# sourceMappingURL=NavLink.js.map