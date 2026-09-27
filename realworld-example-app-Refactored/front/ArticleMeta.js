"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const ArticleActions_1 = __importDefault(require("front/ArticleActions"));
const CustomImage_1 = __importDefault(require("front/CustomImage"));
const CustomLink_1 = __importDefault(require("front/CustomLink"));
const date_1 = require("front/date");
const routes_1 = __importDefault(require("front/routes"));
const ArticleMeta = ({ article }) => {
    if (!article)
        return;
    return (<div className="article-meta">
      <CustomLink_1.default href={routes_1.default.userView(encodeURIComponent(article.author?.username))}>
        <CustomImage_1.default src={article.author?.image} alt="author profile image"/>
      </CustomLink_1.default>
      <div className="info">
        <CustomLink_1.default href={routes_1.default.userView(encodeURIComponent(article.author?.username))} className="author">
          {article.author?.username}
        </CustomLink_1.default>
        <span className="date">{(0, date_1.formatDate)(article.createdAt)}</span>
      </div>
      <ArticleActions_1.default article={article}/>
    </div>);
};
exports.default = ArticleMeta;
//# sourceMappingURL=ArticleMeta.js.map