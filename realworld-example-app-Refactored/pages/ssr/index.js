"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServerSideProps = void 0;
const IndexPage_1 = __importDefault(require("front/IndexPage"));
exports.default = IndexPage_1.default;
const IndexPage_2 = require("back/IndexPage");
exports.getServerSideProps = IndexPage_2.getServerSidePropsHoc;
//# sourceMappingURL=index.js.map