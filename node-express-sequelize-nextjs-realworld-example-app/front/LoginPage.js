"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const head_1 = __importDefault(require("next/head"));
const react_1 = __importDefault(require("react"));
const CustomLink_1 = __importDefault(require("front/CustomLink"));
const LoginForm_1 = __importDefault(require("front/LoginForm"));
const ts_1 = require("front/ts");
const routes_1 = __importDefault(require("front/routes"));
const LoginPageHoc = ({ register = false }) => {
    const title = register ? 'Sign up' : 'Sign in';
    return function Loginpage() {
        const { setTitle } = react_1.default.useContext(ts_1.AppContext);
        react_1.default.useEffect(() => {
            setTitle(title);
        }, [setTitle]);
        return (<>
        <head_1.default>
          <meta name="description" content={register
                ? 'Please register before login'
                : 'Please login to use fully-featured next-realworld site. (Post articles, comments, and like, follow etc.)'}/>
        </head_1.default>
        <div className="auth-page">
          <div className="container page">
            <div className="row">
              <div className="col-md-6 offset-md-3 col-xs-12">
                <h1 className="text-xs-center">{title}</h1>
                <p className="text-xs-center">
                  <CustomLink_1.default href={register ? routes_1.default.userLogin() : routes_1.default.userNew()}>
                    {`${register ? 'Have' : 'Need'}`} an account?
                  </CustomLink_1.default>
                </p>
                <LoginForm_1.default register={register}/>
              </div>
            </div>
          </div>
        </div>
      </>);
    };
};
exports.default = LoginPageHoc;
//# sourceMappingURL=LoginPage.js.map