"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStaticPathsArticle = void 0;
exports.getStaticPropsArticle = getStaticPropsArticle;
const config_1 = require("front/config");
const db_1 = __importDefault(require("db"));
const getStaticPathsArticle = async () => {
    let paths;
    if (config_1.prerenderAll) {
        paths = (await db_1.default.models.Article.findAll()).map((article) => {
            return {
                params: {
                    pid: article.slug,
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
exports.getStaticPathsArticle = getStaticPathsArticle;
function getStaticPropsArticle(addRevalidate, addComments) {
    return async ({ params: { pid } }) => {
        const article = await db_1.default.models.Article.findOne({
            where: { slug: pid },
            include: [{ model: db_1.default.models.User, as: 'author' }],
        });
        if (!article) {
            return {
                notFound: true,
            };
        }
        let comments;
        if (addComments) {
            comments = await article.getComments({
                order: [['createdAt', 'DESC']],
                include: [{ model: db_1.default.models.User, as: 'author' }],
            });
        }
        const props = { article: await article.toJson() };
        if (addComments) {
            props.comments = await Promise.all(comments.map((comment) => comment.toJson()));
        }
        const ret = {
            props,
        };
        // We can only add this for getStaticProps, not getServerSideProps.
        if (addRevalidate) {
            ret.revalidate = config_1.revalidate;
        }
        return ret;
    };
}
//# sourceMappingURL=ArticlePage.js.map