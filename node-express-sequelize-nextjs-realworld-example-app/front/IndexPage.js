"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const head_1 = __importDefault(require("next/head"));
const react_1 = __importDefault(require("react"));
const ArticleList_1 = __importDefault(require("front/ArticleList"));
const Maybe_1 = __importDefault(require("front/Maybe"));
const Tags_1 = __importDefault(require("front/Tags"));
const config_1 = require("front/config");
const useLoggedInUser_1 = __importDefault(require("front/useLoggedInUser"));
const ts_1 = require("front/ts");
const IndexPage = ({ articles, articlesCount, ssr, tags }) => {
    const { page, setPage, tab, setTab, tag, setTag } = react_1.default.useContext(ts_1.AppContext);
    const loggedInUser = (0, useLoggedInUser_1.default)();
    react_1.default.useEffect(() => {
        (0, ts_1.resetIndexState)(setPage, setTab, loggedInUser);
    }, [loggedInUser, setPage, setTab]);
    return (<>
      <head_1.default>
        <meta name="description" content="Next.js + SWR codebase containing realworld examples (CRUD, auth, advanced patterns, etc) that adheres to the realworld spec and API"/>
      </head_1.default>
      <div className="home-page">
        <Maybe_1.default test={!loggedInUser}>
          <div className="banner">
            <div className="container">
              <h1 className="logo-font">{config_1.appName.toLowerCase()}</h1>
              <p>A place to share your knowledge.</p>
            </div>
          </div>
        </Maybe_1.default>
        <div className="container page">
          <div className="row">
            <div className="col-md-9">
              <div className="feed-toggle">
                <ul className="nav nav-pills outline-active">
                  <Maybe_1.default test={loggedInUser}>
                    <li className="nav-item">
                      <a className={`link nav-link${tab === 'feed' ? ' active' : ''}`} onClick={() => {
            setPage(0);
            setTab('feed');
        }}>
                        Your Feed
                      </a>
                    </li>
                  </Maybe_1.default>
                  <li className="nav-item">
                    <a className={`link nav-link${tab === 'global' ? ' active' : ''}`} onClick={() => {
            setPage(0);
            setTab('global');
        }}>
                      Global Feed
                    </a>
                  </li>
                  <Maybe_1.default test={tab === 'tag'}>
                    <li className="nav-item">
                      <a className="link nav-link active">
                        <i className="ion-pound"/> {tag}
                      </a>
                    </li>
                  </Maybe_1.default>
                </ul>
              </div>
              <ArticleList_1.default {...{
        articles,
        articlesCount,
        loggedInUser,
        page,
        setPage,
        what: tab,
        ssr,
        tag,
    }}/>
            </div>
            <div className="col-md-3">
              <div className="sidebar">
                <p>Popular Tags</p>
                <Tags_1.default {...{ tags, ssr, setTab, setTag, setPage }}/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>);
};
exports.default = IndexPage;
//# sourceMappingURL=IndexPage.js.map