"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const router_1 = require("next/router");
const react_1 = __importDefault(require("react"));
const swr_1 = require("swr");
const CustomImage_1 = __importDefault(require("front/CustomImage"));
const CustomLink_1 = __importDefault(require("front/CustomLink"));
const config_1 = require("front/config");
const useLoggedInUser_1 = __importDefault(require("front/useLoggedInUser"));
const ts_1 = require("front/ts");
const routes_1 = __importDefault(require("front/routes"));
const CommentInput = () => {
    const loggedInUser = (0, useLoggedInUser_1.default)();
    const router = (0, router_1.useRouter)();
    const { query: { pid }, } = router;
    const [content, setContent] = react_1.default.useState('');
    const [isLoading, setLoading] = react_1.default.useState(false);
    const handleChange = react_1.default.useCallback((e) => {
        setContent(e.target.value);
    }, []);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await axios_1.default.post(`${config_1.apiPath}/articles/${encodeURIComponent(String(pid))}/comments`, JSON.stringify({
            comment: {
                body: content,
            },
        }), {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Token ${encodeURIComponent(loggedInUser?.token)}`,
            },
        });
        setLoading(false);
        setContent('');
        (0, swr_1.trigger)(`${config_1.apiPath}/articles/${pid}/comments`);
    };
    (0, ts_1.useCtrlEnterSubmit)(handleSubmit);
    if (!loggedInUser) {
        return (<>
        <CustomLink_1.default href={routes_1.default.userLogin()}>Sign in</CustomLink_1.default> or{' '}
        <CustomLink_1.default href={routes_1.default.userNew()}>sign up</CustomLink_1.default> to add comments
        on this article.
      </>);
    }
    return (<>
      <ul className="error-messages">
        {/* TODO. Reference does not handle those errors either right now.
        but the unconditional (and likely buggy) presence of this is visible. */}
      </ul>
      <form className="card comment-form" onSubmit={handleSubmit}>
        <fieldset>
          <div className="card-block">
            <textarea rows={3} className="form-control" placeholder="Write a comment..." value={content} onChange={handleChange} disabled={isLoading}/>
          </div>
          <div className="card-footer">
            <CustomImage_1.default className="comment-author-img" src={loggedInUser.effectiveImage} alt="author profile image"/>
            <button className="btn btn-sm btn-primary" type="submit">
              Post Comment
            </button>
          </div>
        </fieldset>
      </form>
    </>);
};
exports.default = CommentInput;
//# sourceMappingURL=CommentInput.js.map