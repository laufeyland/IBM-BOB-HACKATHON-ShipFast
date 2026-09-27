"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const router_1 = __importDefault(require("next/router"));
const react_1 = __importDefault(require("react"));
const front_1 = require("front");
const ListErrors_1 = __importDefault(require("front/ListErrors"));
const user_1 = __importDefault(require("front/api/user"));
const ts_1 = require("front/ts");
const LoginForm = ({ register = false }) => {
    const [isLoading, setLoading] = react_1.default.useState(false);
    const [errors, setErrors] = react_1.default.useState([]);
    const [username, setUsername] = react_1.default.useState('');
    const [email, setEmail] = react_1.default.useState('');
    const [password, setPassword] = react_1.default.useState('');
    const handleUsernameChange = react_1.default.useCallback((e) => setUsername(e.target.value), [setUsername]);
    const handleEmailChange = react_1.default.useCallback((e) => setEmail(e.target.value), []);
    const handlePasswordChange = react_1.default.useCallback((e) => setPassword(e.target.value), []);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let data, status;
            if (register) {
                ;
                ({ data, status } = await user_1.default.register(username, email, password));
            }
            else {
                ;
                ({ data, status } = await user_1.default.login(email, password));
            }
            if (status !== 200 && data?.errors) {
                setErrors(data.errors);
            }
            if (data?.user) {
                await (0, front_1.setupUserLocalStorage)(data, setErrors);
                router_1.default.push('/');
            }
        }
        catch (error) {
            console.error(error);
        }
        finally {
            setLoading(false);
        }
    };
    (0, ts_1.useCtrlEnterSubmit)(handleSubmit);
    return (<>
      <ListErrors_1.default errors={errors}/>
      <form onSubmit={handleSubmit}>
        <fieldset>
          {register && (<fieldset className="form-group">
              <input className="form-control form-control-lg" type="text" placeholder="Username" value={username} onChange={handleUsernameChange}/>
            </fieldset>)}
          <fieldset className="form-group">
            <input className="form-control form-control-lg" type="email" placeholder="Email" value={email} onChange={handleEmailChange}/>
          </fieldset>
          <fieldset className="form-group">
            <input className="form-control form-control-lg" type="password" placeholder="Password" value={password} onChange={handlePasswordChange}/>
          </fieldset>
          <button className="btn btn-lg btn-primary pull-xs-right" type="submit" disabled={isLoading}>
            {`${register ? 'Sign up' : 'Sign in'}`}
          </button>
        </fieldset>
      </form>
    </>);
};
exports.default = LoginForm;
//# sourceMappingURL=LoginForm.js.map