"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const router_1 = require("next/router");
const react_1 = __importDefault(require("react"));
const swr_1 = __importDefault(require("swr"));
const ArticlePreview_1 = __importDefault(require("front/ArticlePreview"));
const config_1 = require("front/config");
const ErrorMessage_1 = __importDefault(require("front/ErrorMessage"));
const FavoriteArticleButton_1 = require("front/FavoriteArticleButton");
const LoadingSpinner_1 = __importDefault(require("front/LoadingSpinner"));
const Maybe_1 = __importDefault(require("front/Maybe"));
const Pagination_1 = __importDefault(require("front/Pagination"));
const api_1 = __importDefault(require("front/api"));
const ArticleList = ({ articles, articlesCount, loggedInUser, page, setPage, what, ssr, tag = undefined, }) => {
    const router = (0, router_1.useRouter)();
    const { query } = router;
    const { pid } = query;
    // The page can be seen up to date from SSR without refetching,
    // so we skip the fetch.
    const ssrSkipFetch = page === 0 &&
        ((loggedInUser && what === 'feed') || (!loggedInUser && what === 'global'));
    const fetchURL = (() => {
        if (loggedInUser === undefined || (ssr && ssrSkipFetch)) {
            // This makes SWR not fetch.
            return null;
        }
        switch (what) {
            case 'favorites':
                return `${config_1.apiPath}/articles?limit=${config_1.articleLimit}&favorited=${encodeURIComponent(String(pid))}&offset=${page * config_1.articleLimit}`;
            case 'my-posts':
                return `${config_1.apiPath}/articles?limit=${config_1.articleLimit}&author=${encodeURIComponent(String(pid))}&offset=${page * config_1.articleLimit}`;
            case 'tag':
                return `${config_1.apiPath}/articles?limit=${config_1.articleLimit}&tag=${encodeURIComponent(tag)}&offset=${page * config_1.articleLimit}`;
            case 'feed':
                return `${config_1.apiPath}/articles/feed?limit=${config_1.articleLimit}&offset=${page * config_1.articleLimit}`;
            case 'global':
                return `${config_1.apiPath}/articles?limit=${config_1.articleLimit}&offset=${page * config_1.articleLimit}`;
            case undefined:
                // We haven't decided yet because we haven't decided if we are logged in or out yet.
                return null;
            default:
                throw new Error(`Unknown search: ${what}`);
        }
    })();
    const { data, error } = (0, swr_1.default)(fetchURL, (0, api_1.default)());
    let showSpinner = true;
    if (data) {
        ;
        ({ articles, articlesCount } = data);
    }
    else if (
    // If we used server side data on either of those cases, it would lead to wrong
    // data flickering, either for page 0, for for global feed instead of user following feed
    // since both of those share the `/` URL.
    // Instead, we want the loader to flicker.
    // https://github.com/cirosantilli/node-express-sequelize-nextjs-realworld-example-app/issues/12
    (!ssr &&
        page === 0 &&
        // These don't have their own URLs.
        what !== 'feed' &&
        what !== 'tag') ||
        // SSR has all the data it needs, so for sure we won't show the spinner.
        (ssr && (ssrSkipFetch || loggedInUser === undefined))) {
        showSpinner = false;
    }
    else {
        ;
        [articles, articlesCount] = [[], 0];
    }
    // Favorite article button state.
    const favorited = [];
    const setFavorited = [];
    const favoritesCount = [];
    const setFavoritesCount = [];
    // MUST be articleLimit and not articles.length, because articles.length
    // can happen a variable number of times on index page due to:
    // * load ISR page logged off on global
    // * login, which leads to feed instead of global
    // and calling hooks like useState different number of times is a capital sin
    // in React and makes everything blow up.
    for (let i = 0; i < config_1.articleLimit; i++) {
        // https://stackoverflow.com/questions/53906843/why-cant-react-hooks-be-called-inside-loops-or-nested-function
        // https://stackoverflow.com/questions/61345625/ignore-react-hook-react-useeffect-may-be-executed-more-than-once
        // eslint-disable-next-line react-hooks/rules-of-hooks
        ;
        [favorited[i], setFavorited[i]] = react_1.default.useState(false);
        [favoritesCount[i], setFavoritesCount[i]] = react_1.default.useState(0);
    }
    react_1.default.useEffect(() => {
        const nArticles = articles?.length || 0;
        for (let i = 0; i < nArticles; i++) {
            setFavorited[i](articles[i].favorited);
            setFavoritesCount[i](articles[i].favoritesCount);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, Object.assign(articles.map((a) => a.favorited).concat(articles.map((a) => a.favoritesCount)), { length: config_1.articleLimit }));
    if (error)
        return <ErrorMessage_1.default message="Cannot load recent articles..."/>;
    if (!data && showSpinner)
        return <LoadingSpinner_1.default />;
    if (articles?.length === 0) {
        return <div className="article-preview">No articles are here... yet.</div>;
    }
    return (<>
      {articles?.map((article, i) => (<FavoriteArticleButton_1.FavoriteArticleButtonContext.Provider key={article.slug} value={{
                favorited: favorited[i],
                setFavorited: setFavorited[i],
                favoritesCount: favoritesCount[i],
                setFavoritesCount: setFavoritesCount[i],
            }}>
          <ArticlePreview_1.default key={article.slug} article={article}/>
        </FavoriteArticleButton_1.FavoriteArticleButtonContext.Provider>))}
      <Maybe_1.default test={articlesCount && articlesCount > config_1.articleLimit}>
        <Pagination_1.default articlesCount={articlesCount} articlesPerPage={config_1.articleLimit} showPagesMax={10} currentPage={page} setCurrentPage={setPage}/>
      </Maybe_1.default>
    </>);
};
exports.default = ArticleList;
//# sourceMappingURL=ArticleList.js.map