"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const swr_1 = __importDefault(require("swr"));
const api_1 = __importDefault(require("front/api"));
const config_1 = require("front/config");
const ErrorMessage_1 = __importDefault(require("front/ErrorMessage"));
const Tags = ({ tags, ssr, setTab, setPage, setTag }) => {
    const { data, error } = (0, swr_1.default)(ssr ? null : `${config_1.apiPath}/tags`, (0, api_1.default)());
    if (error)
        return <ErrorMessage_1.default message="Cannot load popular tags..."/>;
    if (data) {
        ;
        ({ tags } = data);
    }
    return (<div className="tag-list">
      {tags?.map((tag) => (<a className="link tag-default tag-pill" key={tag} onClick={() => {
                setTab('tag');
                setTag(tag);
                setPage(0);
            }}>
          {tag}
        </a>))}
    </div>);
};
exports.default = Tags;
//# sourceMappingURL=Tags.js.map