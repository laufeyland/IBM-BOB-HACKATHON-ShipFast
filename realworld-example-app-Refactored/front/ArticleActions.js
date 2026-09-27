"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const router_1 = __importStar(require("next/router"));
const react_1 = __importDefault(require("react"));
const swr_1 = require("swr");
const FavoriteArticleButton_1 = __importDefault(require("front/FavoriteArticleButton"));
const FollowUserButton_1 = __importDefault(require("front/FollowUserButton"));
const CustomLink_1 = __importDefault(require("front/CustomLink"));
const Maybe_1 = __importDefault(require("front/Maybe"));
const article_1 = __importDefault(require("front/api/article"));
const config_1 = __importDefault(require("front/config"));
const useLoggedInUser_1 = __importDefault(require("front/useLoggedInUser"));
const routes_1 = __importDefault(require("front/routes"));
const ArticleActions = ({ article }) => {
    const loggedInUser = (0, useLoggedInUser_1.default)();
    const router = (0, router_1.useRouter)();
    const { query: { pid }, } = router;
    const handleDelete = async () => {
        if (!loggedInUser)
            return;
        const result = window.confirm('Do you really want to delete it?');
        if (!result)
            return;
        await article_1.default.delete(pid, loggedInUser?.token);
        (0, swr_1.trigger)(`${config_1.default}/articles/${pid}`);
        router_1.default.push(`/`);
    };
    const canModify = loggedInUser && loggedInUser?.username === article?.author?.username;
    return (<>
      <Maybe_1.default test={!canModify}>
        <span>
          <FollowUserButton_1.default profile={article.author}/>
          <FavoriteArticleButton_1.default favorited={article.favorited} favoritesCount={article.favoritesCount} slug={article.slug} showText={true}/>
        </span>
      </Maybe_1.default>
      <Maybe_1.default test={canModify}>
        <span>
          <CustomLink_1.default href={routes_1.default.articleEdit(article.slug)} className="btn btn-outline-secondary btn-sm">
            <i className="ion-edit"/> Edit Article
          </CustomLink_1.default>
          <button className="btn btn-outline-danger btn-sm" onClick={handleDelete}>
            <i className="ion-trash-a"/> Delete Article
          </button>
        </span>
      </Maybe_1.default>
    </>);
};
exports.default = ArticleActions;
//# sourceMappingURL=ArticleActions.js.map