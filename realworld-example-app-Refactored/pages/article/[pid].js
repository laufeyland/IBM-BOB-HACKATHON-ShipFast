"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStaticProps = exports.getStaticPaths = void 0;
const marked_1 = __importDefault(require("marked"));
const link_1 = __importDefault(require("next/link"));
const router_1 = require("next/router");
const react_1 = __importDefault(require("react"));
const swr_1 = __importDefault(require("swr"));
const ArticleMeta_1 = __importDefault(require("front/ArticleMeta"));
const Comment_1 = __importDefault(require("front/Comment"));
const CommentInput_1 = __importDefault(require("front/CommentInput"));
const FavoriteArticleButton_1 = require("front/FavoriteArticleButton");
const LoadingSpinner_1 = __importDefault(require("front/LoadingSpinner"));
const FollowUserButton_1 = require("front/FollowUserButton");
const api_1 = __importDefault(require("front/api"));
const config_1 = require("front/config");
const ts_1 = require("front/ts");
const routes_1 = __importDefault(require("front/routes"));
const ArticlePage = ({ article, comments }) => {
    const router = (0, router_1.useRouter)();
    // Fetch user-specific data.
    // Article determines if the curent user favorited the article or not
    const { data: articleApi } = (0, swr_1.default)(`${config_1.apiPath}/articles/${article?.slug}`, (0, api_1.default)(router.isFallback));
    if (articleApi !== undefined) {
        article = articleApi.article;
    }
    // We fetch comments so that the new posted comment will appear immediately after posted.
    // Note that we cannot calculate the exact new coment element because we need the server datetime.
    const { data: commentApi } = (0, swr_1.default)(`${config_1.apiPath}/articles/${article?.slug}/comments`, (0, api_1.default)(router.isFallback));
    if (commentApi !== undefined) {
        comments = commentApi.comments;
    }
    // TODO it is not ideal to have to setup state on every parent of FavoriteUserButton/FollowUserButton,
    // but I just don't know how to avoid it nicely, especially considering that the
    // button shows up on both profile and article pages, and thus comes from different
    // API data, so useSWR is not a clean.
    const [following, setFollowing] = react_1.default.useState(false);
    react_1.default.useEffect(() => {
        setFollowing(article?.author.following);
    }, [article?.author.following]);
    const [favorited, setFavorited] = react_1.default.useState(false);
    const [favoritesCount, setFavoritesCount] = react_1.default.useState(article?.favoritesCount);
    react_1.default.useEffect(() => {
        setFavorited(article?.favorited);
        setFavoritesCount(article?.favoritesCount);
    }, [article?.favorited, article?.favoritesCount]);
    const { setPage, setTab, setTag, setTitle } = react_1.default.useContext(ts_1.AppContext);
    react_1.default.useEffect(() => {
        setTitle(article?.title);
    }, [setTitle, article?.title]);
    if (router.isFallback) {
        return <LoadingSpinner_1.default />;
    }
    const markup = { __html: (0, marked_1.default)(article.body) };
    return (<>
      <div className="article-page">
        <div className="banner">
          <div className="container">
            <h1>{article.title}</h1>
            <FavoriteArticleButton_1.FavoriteArticleButtonContext.Provider value={{
            favorited,
            setFavorited,
            favoritesCount,
            setFavoritesCount,
        }}>
              <FollowUserButton_1.FollowUserButtonContext.Provider value={{
            following,
            setFollowing,
        }}>
                <ArticleMeta_1.default article={article}/>
              </FollowUserButton_1.FollowUserButtonContext.Provider>
            </FavoriteArticleButton_1.FavoriteArticleButtonContext.Provider>
          </div>
        </div>
        <div className="container page">
          <div className="row article-content">
            <div className="col-md-12">
              <div dangerouslySetInnerHTML={markup}/>
              <ul className="tag-list">
                {article.tagList?.map((tag) => (<li className="tag-default tag-pill tag-outline" key={tag}>
                    {tag}
                    {false && (<>
                        TODO link to index tag list from here. This code almost
                        works, but fails because of the resetIndexState call on
                        pages/index.jsx. The problem is I dont know how to
                        differentiate between clicking a link like this (we want
                        non-default state) and first visit/page refresh (we want
                        default state). This was not in the original Realworld
                        app, but would be an obvious addition:
                        https://github.com/gothinkster/realworld/issues/649 I
                        also tried to add a global flag to make index reset only
                        once, but since each page re-renders several times due
                        to hooks, that didnt work.
                        <link_1.default href={routes_1.default.home()}>
                          <a onClick={() => {
                    setTab('tag');
                    setTag(tag);
                    setPage(0);
                }}>
                            {tag}
                          </a>
                        </link_1.default>
                      </>)}
                  </li>))}
              </ul>
            </div>
          </div>
          <hr />
          <div className="article-actions">
            <FavoriteArticleButton_1.FavoriteArticleButtonContext.Provider value={{
            favorited,
            setFavorited,
            favoritesCount,
            setFavoritesCount,
        }}>
              <FollowUserButton_1.FollowUserButtonContext.Provider value={{
            following,
            setFollowing,
        }}>
                <ArticleMeta_1.default article={article}/>
              </FollowUserButton_1.FollowUserButtonContext.Provider>
            </FavoriteArticleButton_1.FavoriteArticleButtonContext.Provider>
          </div>
          <div className="row">
            <div className="col-xs-12 col-md-8 offset-md-2">
              <div>
                <CommentInput_1.default />
                {comments?.map((comment) => (<Comment_1.default key={comment.id} comment={comment}/>))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>);
};
exports.default = ArticlePage;
// Server only.
const ArticlePage_1 = require("back/ArticlePage");
exports.getStaticPaths = ArticlePage_1.getStaticPathsArticle;
exports.getStaticProps = (0, ArticlePage_1.getStaticPropsArticle)(true, true);
//# sourceMappingURL=%5Bpid%5D.js.map