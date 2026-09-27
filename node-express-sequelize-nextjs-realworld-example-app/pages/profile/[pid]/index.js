"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStaticProps = exports.getStaticPaths = void 0;
const ProfilePage_1 = require("back/ProfilePage");
const ProfilePage_2 = __importDefault(require("front/ProfilePage"));
exports.getStaticPaths = ProfilePage_1.getStaticPathsProfile;
const type = 'my-posts';
exports.getStaticProps = (0, ProfilePage_1.getStaticPropsProfile)(type);
const Profile = (0, ProfilePage_2.default)(type);
exports.default = Profile;
//# sourceMappingURL=index.js.map