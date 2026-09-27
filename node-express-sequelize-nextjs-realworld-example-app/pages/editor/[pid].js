"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServerSideProps = void 0;
const ArticlePage_1 = require("back/ArticlePage");
exports.getServerSideProps = (0, ArticlePage_1.getStaticPropsArticle)();
const ArticleEditor_1 = __importDefault(require("front/ArticleEditor"));
exports.default = (0, ArticleEditor_1.default)();
//# sourceMappingURL=%5Bpid%5D.js.map