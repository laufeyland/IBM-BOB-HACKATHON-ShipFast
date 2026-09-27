"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const head_1 = __importDefault(require("next/head"));
const router_1 = require("next/router");
const react_1 = __importDefault(require("react"));
const swr_1 = require("swr");
const CustomLink_1 = __importDefault(require("front/CustomLink"));
const Navbar_1 = __importDefault(require("front/Navbar"));
const config_1 = require("front/config");
const ts_1 = require("front/ts");
const routes_1 = __importDefault(require("front/routes"));
// Packages.
require("ionicons/css/ionicons.min.css");
require("@fontsource/titillium-web/700.css");
require("@fontsource/source-serif-pro/400.css");
require("@fontsource/source-serif-pro/700.css");
require("@fontsource/source-sans-pro/300.css");
require("@fontsource/source-sans-pro/400.css");
require("@fontsource/source-sans-pro/600.css");
require("@fontsource/source-sans-pro/700.css");
require("@fontsource/source-sans-pro/300-italic.css");
require("@fontsource/source-sans-pro/400-italic.css");
require("@fontsource/source-sans-pro/600-italic.css");
require("@fontsource/source-sans-pro/700-italic.css");
// In tree
require("demo.productionready.io.main.css");
require("style.scss");
function MyHead() {
    const { title } = react_1.default.useContext(ts_1.AppContext);
    const realTitle = title === undefined ? '' : title + ' - ';
    return (<head_1.default>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
      <title>{realTitle + config_1.appName}</title>
    </head_1.default>);
}
function handleRouteChange(url) {
    window.gtag('config', config_1.googleAnalyticsId, {
        page_path: url,
    });
}
const MyApp = ({ Component, pageProps }) => {
    // Google Analytics page switches:
    // https://stackoverflow.com/questions/60411351/how-to-use-google-analytics-with-next-js-app/62552263#62552263
    const router = (0, router_1.useRouter)();
    react_1.default.useEffect(() => {
        if (config_1.isProduction) {
            router.events.on('routeChangeComplete', handleRouteChange);
            return () => {
                router.events.off('routeChangeComplete', handleRouteChange);
            };
        }
    }, [router.events]);
    return (<ts_1.AppContextProvider>
      <swr_1.SWRConfig value={{
            // Do everything to prevent SWR from refreshing pages automatically.
            // When users want to check for new data, they can press F5, otherwise
            // we might overwrite what they were currently looking at.
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            shouldRetryOnError: false,
        }}>
        <MyHead />
        <Navbar_1.default />
        {config_1.isDemo && (<div className="container" style={{ marginBottom: '20px' }}>
            Source code for this website:{' '}
            <a href="https://github.com/cirosantilli/node-express-sequelize-nextjs-realworld-example-app">
              https://github.com/cirosantilli/node-express-sequelize-nextjs-realworld-example-app
            </a>
          </div>)}
        <Component {...pageProps}/>
        <footer>
          <div className="container">
            <CustomLink_1.default href={routes_1.default.home()} className="logo-font">
              {config_1.appName.toLowerCase()}
            </CustomLink_1.default>
            <span className="attribution">
              {' '}
              © 2021. An interactive learning project from{' '}
              <a href="https://thinkster.io">Thinkster</a>. Code licensed under
              MIT.
            </span>
          </div>
        </footer>
      </swr_1.SWRConfig>
    </ts_1.AppContextProvider>);
};
exports.default = MyApp;
//# sourceMappingURL=_app.js.map