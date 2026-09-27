"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const router_1 = __importDefault(require("next/router"));
const react_1 = __importDefault(require("react"));
const front_1 = require("front");
const config_1 = require("front/config");
const ListErrors_1 = __importDefault(require("front/ListErrors"));
const useLoggedInUser_1 = __importDefault(require("front/useLoggedInUser"));
const ts_1 = require("front/ts");
const SettingsForm = () => {
    const [isLoading, setLoading] = react_1.default.useState(false);
    const [errors, setErrors] = react_1.default.useState([]);
    const [userInfo, setUserInfo] = react_1.default.useState({
        image: '',
        username: '',
        bio: '',
        email: '',
        password: '',
    });
    const loggedInUser = (0, useLoggedInUser_1.default)();
    react_1.default.useEffect(() => {
        if (!loggedInUser)
            return;
        setUserInfo((prev) => Object.assign(prev, loggedInUser));
    }, [loggedInUser]);
    const updateState = (field) => (e) => {
        setUserInfo({ ...userInfo, [field]: e.target.value });
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const user = { ...userInfo };
        if (!user.password) {
            delete user.password;
        }
        const { data, status } = await axios_1.default.put(`${config_1.apiPath}/user`, JSON.stringify({ user }), {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Token ${loggedInUser?.token}`,
            },
        });
        setLoading(false);
        if (status !== 200) {
            setErrors(data.errors.body);
        }
        if (data?.user) {
            await (0, front_1.setupUserLocalStorage)(data, setErrors);
            router_1.default.push(`/profile/${user.username}`);
        }
    };
    (0, ts_1.useCtrlEnterSubmit)(handleSubmit);
    return (<react_1.default.Fragment>
      <ListErrors_1.default errors={errors}/>
      <form onSubmit={handleSubmit}>
        <fieldset>
          <fieldset className="form-group">
            <input className="form-control" type="text" placeholder="URL of profile picture" value={userInfo.image ? userInfo.image : ''} onChange={updateState('image')}/>
          </fieldset>
          <fieldset className="form-group">
            <input className="form-control form-control-lg" type="text" placeholder="Username" value={userInfo.username} onChange={updateState('username')}/>
          </fieldset>
          <fieldset className="form-group">
            <textarea className="form-control form-control-lg" rows={8} placeholder="Short bio about you" value={userInfo.bio} onChange={updateState('bio')}/>
          </fieldset>
          <fieldset className="form-group">
            <input className="form-control form-control-lg" type="email" placeholder="Email" value={userInfo.email} onChange={updateState('email')}/>
          </fieldset>
          <fieldset className="form-group">
            <input className="form-control form-control-lg" type="password" placeholder="New Password" value={userInfo.password} onChange={updateState('password')} autoComplete="new-password"/>
          </fieldset>
          <button className="btn btn-lg btn-primary pull-xs-right" type="submit" disabled={isLoading}>
            Update Settings
          </button>
        </fieldset>
      </form>
    </react_1.default.Fragment>);
};
exports.default = SettingsForm;
//# sourceMappingURL=SettingsForm.js.map