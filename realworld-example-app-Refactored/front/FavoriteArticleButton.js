"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoriteArticleButtonContext = void 0;
const axios_1 = __importDefault(require("axios"));
const react_1 = __importDefault(require("react"));
const router_1 = __importDefault(require("next/router"));
const config_1 = require("front/config");
const useLoggedInUser_1 = __importDefault(require("front/useLoggedInUser"));
const FAVORITED_CLASS = 'btn btn-sm btn-primary';
const NOT_FAVORITED_CLASS = 'btn btn-sm btn-outline-primary';
exports.FavoriteArticleButtonContext = react_1.default.createContext(undefined);
const FavoriteArticleButton = (props) => {
    const loggedInUser = (0, useLoggedInUser_1.default)();
    const { favorited, setFavorited, favoritesCount, setFavoritesCount } = react_1.default.useContext(exports.FavoriteArticleButtonContext);
    let buttonText;
    if (props.showText) {
        if (favorited) {
            buttonText = 'Unfavorite';
        }
        else {
            buttonText = 'Favorite';
        }
        buttonText = ' ' + buttonText + ' Article ';
    }
    else {
        buttonText = '';
    }
    const handleClickFavorite = async () => {
        if (!loggedInUser) {
            router_1.default.push(`/user/login`);
            return;
        }
        setFavorited((prev) => !prev);
        setFavoritesCount((prev) => prev + (favorited ? -1 : 1));
        try {
            if (favorited) {
                await axios_1.default.delete(`${config_1.apiPath}/articles/${props.slug}/favorite`, {
                    headers: {
                        Authorization: `Token ${loggedInUser?.token}`,
                    },
                });
            }
            else {
                await axios_1.default.post(`${config_1.apiPath}/articles/${props.slug}/favorite`, {}, {
                    headers: {
                        Authorization: `Token ${loggedInUser?.token}`,
                    },
                });
            }
        }
        catch (error) {
            setFavorited((prev) => !prev);
            setFavoritesCount((prev) => prev + (favorited ? 1 : -1));
        }
    };
    let count = favoritesCount;
    if (props.showText) {
        count = <span className="counter">({count})</span>;
    }
    return (<button className={favorited ? FAVORITED_CLASS : NOT_FAVORITED_CLASS} onClick={() => handleClickFavorite()}>
      <i className="ion-heart"/>
      {props.showText ? ' ' : ''}
      {buttonText} {count}
    </button>);
};
exports.default = FavoriteArticleButton;
//# sourceMappingURL=FavoriteArticleButton.js.map