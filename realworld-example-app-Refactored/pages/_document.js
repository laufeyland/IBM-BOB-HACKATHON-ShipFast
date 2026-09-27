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
const document_1 = __importStar(require("next/document"));
const react_1 = __importDefault(require("react"));
const config_1 = require("front/config");
class MyDocument extends document_1.default {
    static async getInitialProps(ctx) {
        const initialProps = await document_1.default.getInitialProps(ctx);
        const { html, head } = ctx.renderPage();
        return { ...initialProps, html, head };
    }
    render() {
        return (<document_1.Html lang="en">
        <document_1.Head>
          {config_1.isProduction && (<>
              <script async src={`https://www.googletagmanager.com/gtag/js?id=${config_1.googleAnalyticsId}`}></script>
              <script dangerouslySetInnerHTML={{
                    __html: `window.dataLayer = window.dataLayer || []
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date())
gtag('config', '${config_1.googleAnalyticsId}', { page_path: window.location.pathname })
`,
                }}/>
            </>)}
        </document_1.Head>
        <body>
          <document_1.Main />
          <document_1.NextScript />
        </body>
      </document_1.Html>);
    }
}
exports.default = MyDocument;
//# sourceMappingURL=_document.js.map