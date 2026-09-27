"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const CustomLink_1 = __importDefault(require("front/CustomLink"));
const CustomImage_1 = __importDefault(require("front/CustomImage"));
const FavoriteArticleButton_1 = __importDefault(require("front/FavoriteArticleButton"));
const date_1 = require("front/date");
const routes_1 = __importDefault(require("front/routes"));
const ArticlePreview = ({ article }) => {
    const preview = article;
    if (!article)
        return;
    return (<div className="article-preview">
      <div className="article-meta">
        <CustomLink_1.default href={routes_1.default.userView(preview.author.username)}>
          <CustomImage_1.default src={preview.author.image} alt="author profile image"/>
        </CustomLink_1.default>
        <div className="info">
          <CustomLink_1.default href={routes_1.default.userView(preview.author.username)} className="author">
            {preview.author.username}
          </CustomLink_1.default>
          <span className="date">{(0, date_1.formatDate)(preview.createdAt)}</span>
        </div>
        <div className="pull-xs-right">
          <FavoriteArticleButton_1.default favorited={preview.favorited} favoritesCount={preview.favoritesCount} slug={preview.slug}/>
        </div>
      </div>
      <CustomLink_1.default href={routes_1.default.articleView(preview.slug)} className="preview-link">
        <h1>{preview.title}</h1>
        <p>{preview.description}</p>
        <span>Read more...</span>
        <ul className="tag-list">
          {preview.tagList.map((tag, index) => {
            return (<li className="tag-default tag-pill tag-outline" key={index}>
                {tag}
              </li>);
        })}
        </ul>
      </CustomLink_1.default>
    </div>);
};
exports.default = ArticlePreview;
//# sourceMappingURL=ArticlePreview.js.map