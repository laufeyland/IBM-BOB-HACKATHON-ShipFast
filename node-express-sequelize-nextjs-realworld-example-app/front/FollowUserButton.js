"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowUserButtonContext = void 0;
const react_1 = __importDefault(require("react"));
const router_1 = __importDefault(require("next/router"));
const user_1 = __importDefault(require("front/api/user"));
const useLoggedInUser_1 = __importDefault(require("front/useLoggedInUser"));
exports.FollowUserButtonContext = react_1.default.createContext(undefined);
const FollowUserButton = ({ profile }) => {
    const loggedInUser = (0, useLoggedInUser_1.default)();
    const { following, setFollowing } = react_1.default.useContext(exports.FollowUserButtonContext);
    const { username } = profile;
    const isCurrentUser = loggedInUser && username === loggedInUser?.username;
    if (loggedInUser && isCurrentUser) {
        return null;
    }
    const handleClick = (e) => {
        e.preventDefault();
        if (!loggedInUser) {
            router_1.default.push(`/user/login`);
            return;
        }
        if (following) {
            user_1.default.unfollow(username);
        }
        else {
            user_1.default.follow(username);
        }
        setFollowing(!following);
    };
    return (<button className={`btn btn-sm action-btn ${following ? 'btn-secondary' : 'btn-outline-secondary'}`} onClick={handleClick}>
      <i className="ion-plus-round"/> &nbsp;{' '}
      {following ? 'Unfollow' : 'Follow'} {username}
    </button>);
};
exports.default = FollowUserButton;
//# sourceMappingURL=FollowUserButton.js.map