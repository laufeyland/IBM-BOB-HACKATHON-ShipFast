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
exports.default = ArticleEditorHoc;
const router_1 = __importStar(require("next/router"));
const react_1 = __importDefault(require("react"));
const ListErrors_1 = __importDefault(require("front/ListErrors"));
const TagInput_1 = __importDefault(require("front/TagInput"));
const article_1 = __importDefault(require("front/api/article"));
const useLoggedInUser_1 = __importDefault(require("front/useLoggedInUser"));
const ts_1 = require("front/ts");
const ts_2 = require("front/ts");
function editorReducer(state, action) {
    switch (action.type) {
        case 'SET_TITLE':
            return {
                ...state,
                title: action.text,
            };
        case 'SET_DESCRIPTION':
            return {
                ...state,
                description: action.text,
            };
        case 'SET_BODY':
            return {
                ...state,
                body: action.text,
            };
        case 'ADD_TAG':
            return {
                ...state,
                tagList: state.tagList.concat(action.tag),
            };
        case 'REMOVE_TAG':
            return {
                ...state,
                tagList: state.tagList.filter((tag) => tag !== action.tag),
            };
        default:
            throw new Error('Unhandled action');
    }
}
function ArticleEditorHoc(isnew = false) {
    return function ArticleEditor({ article: initialArticle }) {
        let initialState;
        if (initialArticle) {
            initialState = {
                title: initialArticle.title,
                description: initialArticle.description,
                body: initialArticle.body,
                tagList: initialArticle.tagList,
            };
        }
        else {
            initialState = {
                title: '',
                description: '',
                body: '',
                tagList: [],
            };
        }
        const [isLoading, setLoading] = react_1.default.useState(false);
        const [errors, setErrors] = react_1.default.useState([]);
        const [posting, dispatch] = react_1.default.useReducer(editorReducer, initialState);
        const loggedInUser = (0, useLoggedInUser_1.default)();
        const router = (0, router_1.useRouter)();
        const handleTitle = (e) => dispatch({ type: 'SET_TITLE', text: e.target.value });
        const handleDescription = (e) => dispatch({ type: 'SET_DESCRIPTION', text: e.target.value });
        const handleBody = (e) => dispatch({ type: 'SET_BODY', text: e.target.value });
        const addTag = (tag) => dispatch({ type: 'ADD_TAG', tag: tag });
        const removeTag = (tag) => dispatch({ type: 'REMOVE_TAG', tag: tag });
        const handleSubmit = async (e) => {
            e.preventDefault();
            setLoading(true);
            let data, status;
            if (isnew) {
                ;
                ({ data, status } = await article_1.default.create(posting, loggedInUser?.token));
            }
            else {
                ;
                ({ data, status } = await article_1.default.update(posting, router.query.pid, loggedInUser?.token));
            }
            setLoading(false);
            if (status !== 200) {
                setErrors(data.errors);
            }
            router_1.default.push(`/article/${data.article.slug}`);
        };
        (0, ts_1.useCtrlEnterSubmit)(handleSubmit);
        const { setTitle } = react_1.default.useContext(ts_2.AppContext);
        react_1.default.useEffect(() => {
            setTitle(isnew ? 'New article' : `Editing: ${initialArticle?.title}`);
        }, [setTitle, initialArticle?.title]);
        return (<>
        <div className="editor-page">
          <div className="container page">
            <div className="row">
              <div className="col-md-10 offset-md-1 col-xs-12">
                <ListErrors_1.default errors={errors}/>
                <form>
                  <fieldset>
                    <fieldset className="form-group">
                      <input className="form-control form-control-lg" type="text" placeholder="Article Title" value={posting.title} onChange={handleTitle}/>
                    </fieldset>
                    <fieldset className="form-group">
                      <input className="form-control" type="text" placeholder="What's this article about?" value={posting.description} onChange={handleDescription}/>
                    </fieldset>
                    <fieldset className="form-group">
                      <textarea className="form-control" rows={8} placeholder="Write your article (in markdown)" value={posting.body} onChange={handleBody}/>
                    </fieldset>
                    <TagInput_1.default tagList={posting.tagList} addTag={addTag} removeTag={removeTag}/>
                    <button className="btn btn-lg pull-xs-right btn-primary" type="button" disabled={isLoading} onClick={handleSubmit}>
                      {isnew ? 'Publish' : 'Update'} Article
                    </button>
                  </fieldset>
                </form>
              </div>
            </div>
          </div>
        </div>
      </>);
    };
}
//# sourceMappingURL=ArticleEditor.js.map