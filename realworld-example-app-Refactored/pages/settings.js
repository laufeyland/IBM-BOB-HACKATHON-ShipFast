"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const router_1 = __importDefault(require("next/router"));
const react_1 = __importDefault(require("react"));
const swr_1 = require("swr");
const front_1 = require("front");
const SettingsForm_1 = __importDefault(require("front/SettingsForm"));
const checkLogin_1 = __importDefault(require("front/checkLogin"));
const localStorageHelper_1 = __importDefault(require("front/localStorageHelper"));
const ts_1 = require("front/ts");
const front_2 = require("front");
const Settings = () => {
    react_1.default.useEffect(() => {
        const loggedInUser = (0, localStorageHelper_1.default)(front_1.AUTH_LOCAL_STORAGE_NAME);
        const isLoggedIn = (0, checkLogin_1.default)(loggedInUser);
        if (!isLoggedIn) {
            router_1.default.push(`/`);
        }
    });
    const handleLogout = async (e) => {
        e.preventDefault();
        window.localStorage.removeItem('user');
        (0, front_2.deleteCookie)('auth');
        (0, swr_1.mutate)('user', null);
        router_1.default.push(`/`).then(() => (0, swr_1.trigger)('user'));
    };
    const title = 'Your Settings';
    const { setTitle } = react_1.default.useContext(ts_1.AppContext);
    react_1.default.useEffect(() => {
        setTitle(title);
    }, [setTitle, title]);
    return (<>
      <div className="settings-page">
        <div className="container page">
          <div className="row">
            <div className="col-md-6 offset-md-3 col-xs-12">
              <h1 className="text-xs-center">{title}</h1>
              <SettingsForm_1.default />
              <hr />
              <button className="btn btn-outline-danger" onClick={handleLogout}>
                Or click here to logout.
              </button>
            </div>
          </div>
        </div>
      </div>
    </>);
};
exports.default = Settings;
//# sourceMappingURL=settings.js.map