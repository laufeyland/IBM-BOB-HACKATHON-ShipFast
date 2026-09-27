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
const router_1 = require("next/router");
const react_1 = __importDefault(require("react"));
const swr_1 = __importDefault(require("swr"));
const ArticleList_1 = __importDefault(require("front/ArticleList"));
const CustomLink_1 = __importDefault(require("front/CustomLink"));
const CustomImage_1 = __importDefault(require("front/CustomImage"));
const LoadingSpinner_1 = __importDefault(require("front/LoadingSpinner"));
const EditProfileButton_1 = __importDefault(require("front/EditProfileButton"));
const FollowUserButton_1 = __importStar(require("front/FollowUserButton"));
const api_1 = __importDefault(require("front/api"));
const config_1 = require("front/config");
const useLoggedInUser_1 = __importDefault(require("front/useLoggedInUser"));
const ts_1 = require("front/ts");
const routes_1 = __importDefault(require("front/routes"));
const ProfileHoc = (tab) => {
    return function ProfilePage({ profile, articles, articlesCount }) {
        const [page, setPage] = react_1.default.useState(0);
        const router = (0, router_1.useRouter)();
        const { data: profileApi } = (0, swr_1.default)(`${config_1.apiPath}/profiles/${profile?.username}`, (0, api_1.default)(router.isFallback));
        if (profileApi !== undefined) {
            profile = profileApi.profile;
        }
        const username = profile?.username;
        const bio = profile?.bio;
        const image = profile?.image;
        const loggedInUser = (0, useLoggedInUser_1.default)();
        const isCurrentUser = loggedInUser && username === loggedInUser?.username;
        const [following, setFollowing] = react_1.default.useState(false);
        react_1.default.useEffect(() => {
            setFollowing(profile?.following);
        }, [profile?.following]);
        const { setTitle } = react_1.default.useContext(ts_1.AppContext);
        react_1.default.useEffect(() => {
            setTitle(username);
        }, [setTitle, username]);
        if (router.isFallback) {
            return <LoadingSpinner_1.default />;
        }
        return (<>
        <div className="profile-page">
          <div className="user-info">
            <div className="container">
              <div className="row">
                <div className="col-xs-12 col-md-10 offset-md-1">
                  <CustomImage_1.default src={image} alt="User's profile image" className="user-img"/>
                  <h4>{username}</h4>
                  <p>{bio}</p>
                  <EditProfileButton_1.default isCurrentUser={isCurrentUser}/>
                  <FollowUserButton_1.FollowUserButtonContext.Provider value={{ following, setFollowing }}>
                    <FollowUserButton_1.default profile={profile}/>
                  </FollowUserButton_1.FollowUserButtonContext.Provider>
                </div>
              </div>
            </div>
          </div>
          <div className="container">
            <div className="row">
              <div className="col-xs-12 col-md-10 offset-md-1">
                <div className="articles-toggle">
                  <ul className="nav nav-pills outline-active">
                    <li className="nav-item">
                      <CustomLink_1.default href={routes_1.default.userView(encodeURIComponent(username))} className={`nav-link${tab === 'my-posts' ? ' active' : ''}`}>
                        My Posts
                      </CustomLink_1.default>
                    </li>
                    <li className="nav-item">
                      <CustomLink_1.default href={routes_1.default.userViewLikes(encodeURIComponent(username))} className={`nav-link${tab === 'favorites' ? ' active' : ''}`}>
                        Favorited Posts
                      </CustomLink_1.default>
                    </li>
                  </ul>
                </div>
                <ArticleList_1.default {...{
            articles,
            articlesCount,
            loggedInUser,
            page,
            setPage,
            ssr: false,
            what: tab,
        }}/>
              </div>
            </div>
          </div>
        </div>
      </>);
    };
};
exports.default = ProfileHoc;
//# sourceMappingURL=ProfilePage.js.map