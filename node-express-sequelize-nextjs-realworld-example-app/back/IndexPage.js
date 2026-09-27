"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStaticPropsHoc = exports.getServerSidePropsHoc = void 0;
exports.getLoggedInUser = getLoggedInUser;
const jsonwebtoken_1 = require("jsonwebtoken");
const front_1 = require("front");
const config_1 = require("front/config");
const db_1 = __importDefault(require("db"));
const lib_1 = require("lib");
async function getLoggedOutProps() {
    const articles = await db_1.default.models.Article.findAndCountAll({
        order: [['createdAt', 'DESC']],
        limit: config_1.articleLimit,
    });
    return {
        articles: await Promise.all(articles.rows.map((article) => article.toJson())),
        articlesCount: articles.count,
        tags: await (0, lib_1.getIndexTags)(db_1.default),
    };
}
async function getLoggedInUser(req, res) {
    const authCookie = (0, front_1.getCookieFromReq)(req, front_1.AUTH_COOKIE_NAME);
    let verifiedUser;
    if (authCookie) {
        try {
            verifiedUser = (0, jsonwebtoken_1.verify)(authCookie, config_1.secret);
        }
        catch (e) {
            return null;
        }
    }
    else {
        return null;
    }
    const user = await db_1.default.models.User.findByPk(verifiedUser.id);
    if (user === null) {
        res.clearCookie(front_1.AUTH_COOKIE_NAME);
    }
    return user;
}
const getServerSidePropsHoc = async ({ req, res, }) => {
    const loggedInUser = await getLoggedInUser(req, res);
    let props;
    if (loggedInUser) {
        const [articles, tags] = await Promise.all([
            loggedInUser.findAndCountArticlesByFollowedToJson(0, config_1.articleLimit),
            (0, lib_1.getIndexTags)(req.sequelize),
        ]);
        props = Object.assign(articles, { tags });
    }
    else {
        props = await getLoggedOutProps();
    }
    // Not required by Next, just to factor things out in our demo which has both ISR and SSR.
    props.ssr = true;
    return { props };
};
exports.getServerSidePropsHoc = getServerSidePropsHoc;
const getStaticPropsHoc = async () => {
    return {
        props: await getLoggedOutProps(),
        revalidate: config_1.revalidate,
    };
};
exports.getStaticPropsHoc = getStaticPropsHoc;
//# sourceMappingURL=IndexPage.js.map