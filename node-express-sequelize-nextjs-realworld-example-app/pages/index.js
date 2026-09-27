"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStaticProps = void 0;
const IndexPage_1 = __importDefault(require("front/IndexPage"));
exports.default = IndexPage_1.default;
const IndexPage_2 = require("back/IndexPage");
exports.getStaticProps = IndexPage_2.getStaticPropsHoc;
//# sourceMappingURL=index.js.map