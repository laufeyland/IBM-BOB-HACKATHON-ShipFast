"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const CustomImage_1 = __importDefault(require("front/CustomImage"));
const CustomLink_1 = __importDefault(require("front/CustomLink"));
const Maybe_1 = __importDefault(require("front/Maybe"));
const NavLink_1 = __importDefault(require("front/NavLink"));
const config_1 = require("front/config");
const useLoggedInUser_1 = __importDefault(require("front/useLoggedInUser"));
const ts_1 = require("front/ts");
const routes_1 = __importDefault(require("front/routes"));
const NavbarItem = ({ children }) => <li className="nav-item">{children}</li>;
const Navbar = () => {
    const loggedInUser = (0, useLoggedInUser_1.default)();
    const { setPage, setTab } = react_1.default.useContext(ts_1.AppContext);
    const clickHandler = () => (0, ts_1.resetIndexState)(setPage, setTab, loggedInUser);
    return (<nav className="navbar navbar-light">
      <div className="container">
        <CustomLink_1.default href={routes_1.default.home()} onClick={clickHandler} className="navbar-brand">
          {config_1.appName.toLowerCase()}
        </CustomLink_1.default>
        <ul className="nav navbar-nav pull-xs-right">
          <NavbarItem>
            <NavLink_1.default href={routes_1.default.home()} onClick={clickHandler}>
              Home
            </NavLink_1.default>
          </NavbarItem>
          <Maybe_1.default test={loggedInUser}>
            <NavbarItem>
              <NavLink_1.default href={routes_1.default.articleNew()}>
                <i className="ion-compose"/>
                &nbsp;New Article
              </NavLink_1.default>
            </NavbarItem>
            <NavbarItem>
              <NavLink_1.default href={routes_1.default.userEdit()}>
                <i className="ion-gear-a"/>
                &nbsp;Settings
              </NavLink_1.default>
            </NavbarItem>
            <NavbarItem>
              <NavLink_1.default href={routes_1.default.userView(loggedInUser?.username)}>
                <CustomImage_1.default className="user-pic" src={loggedInUser?.effectiveImage} alt="your profile image"/>
                {loggedInUser?.username}
              </NavLink_1.default>
            </NavbarItem>
          </Maybe_1.default>
          <Maybe_1.default test={!loggedInUser}>
            <NavbarItem>
              <NavLink_1.default href={routes_1.default.userLogin()}>Sign in</NavLink_1.default>
            </NavbarItem>
            <NavbarItem>
              <NavLink_1.default href={routes_1.default.userNew()}>Sign up</NavLink_1.default>
            </NavbarItem>
          </Maybe_1.default>
        </ul>
      </div>
    </nav>);
};
exports.default = Navbar;
//# sourceMappingURL=Navbar.js.map