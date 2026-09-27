"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStaticPathsProfile = void 0;
exports.getStaticPropsProfile = getStaticPropsProfile;
const config_1 = require("front/config");
const db_1 = __importDefault(require("db"));
const getStaticPathsProfile = async () => {
    let paths;
    if (config_1.prerenderAll) {
        paths = (await db_1.default.models.User.findAll({
            order: [['username', 'ASC']],
        })).map((user) => {
            return {
                params: {
                    pid: user.username,
                },
            };
        });
    }
    else {
        paths = [];
    }
    return {
        fallback: config_1.fallback,
        paths,
    };
};
exports.getStaticPathsProfile = getStaticPathsProfile;
function getStaticPropsProfile(tab) {
    return async ({ params: { pid } }) => {
        const include = [];
        if (tab === 'my-posts') {
            include.push({
                model: db_1.default.models.User,
                as: 'author',
                where: { username: pid },
            });
        }
        else if (tab === 'favorites') {
            include.push({
                model: db_1.default.models.User,
                as: 'favoritedBy',
                where: { username: pid },
            });
        }
        const [articles, user] = await Promise.all([
            db_1.default.models.Article.findAndCountAll({
                order: [['createdAt', 'DESC']],
                limit: config_1.articleLimit,
                include,
            }),
            db_1.default.models.User.findOne({
                where: { username: pid },
            }),
        ]);
        if (!user) {
            return {
                notFound: true,
            };
        }
        return {
            revalidate: config_1.revalidate,
            props: {
                profile: await user.toProfileJSONFor(),
                articles: await Promise.all(articles.rows.map((article) => article.toJson())),
                articlesCount: articles.count,
            },
        };
    };
}
//# sourceMappingURL=ProfilePage.js.map