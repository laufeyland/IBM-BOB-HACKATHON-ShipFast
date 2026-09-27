"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppContextProvider = exports.resetIndexState = exports.AppContext = void 0;
exports.useCtrlEnterSubmit = useCtrlEnterSubmit;
const react_1 = __importDefault(require("react"));
const useLoggedInUser_1 = __importDefault(require("front/useLoggedInUser"));
exports.AppContext = react_1.default.createContext({
    page: 0,
    setPage: undefined,
    tab: '',
    setTab: undefined,
    tag: '',
    setTag: undefined,
    title: '',
    setTitle: undefined,
});
function getTabForLoggedInUser(loggedInUser) {
    if (loggedInUser === undefined) {
        return undefined;
    }
    else {
        return loggedInUser === null ? 'global' : 'feed';
    }
}
const resetIndexState = (setPage, setTab, loggedInUser) => {
    setPage(0);
    setTab(getTabForLoggedInUser(loggedInUser));
};
exports.resetIndexState = resetIndexState;
// Global state.
const AppContextProvider = ({ children }) => {
    const loggedInUser = (0, useLoggedInUser_1.default)();
    const [title, setTitle] = react_1.default.useState();
    // This state has to be lifted to app tolevel because there
    // are many things that need to set it from outside of article lists,
    // without recreationg the article list, notably Tags list
    // (when you click a tag, the list updates to filter by it,
    // and you want to go to page 0) and Navigation links (if you
    // are in global while logged in, it will move you to feed,
    // and should reset the page to 0).
    const [page, setPage] = react_1.default.useState(0);
    const [tab, setTab] = react_1.default.useState(getTabForLoggedInUser(loggedInUser));
    const [tag, setTag] = react_1.default.useState('');
    return (<exports.AppContext.Provider value={{
            page,
            setPage,
            tab,
            setTab,
            tag,
            setTag,
            title,
            setTitle,
        }}>
      {children}
    </exports.AppContext.Provider>);
};
exports.AppContextProvider = AppContextProvider;
function useCtrlEnterSubmit(handleSubmit) {
    react_1.default.useEffect(() => {
        function ctrlEnterListener(e) {
            if (e.code === 'Enter' && e.ctrlKey) {
                handleSubmit(e);
            }
        }
        document.addEventListener('keydown', ctrlEnterListener);
        return () => {
            document.removeEventListener('keydown', ctrlEnterListener);
        };
    });
}
//# sourceMappingURL=ts.js.map