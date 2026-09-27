"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const CustomLink_1 = __importDefault(require("front/CustomLink"));
const CustomImage_1 = __importDefault(require("front/CustomImage"));
const Maybe_1 = __importDefault(require("front/Maybe"));
const DeleteButton_1 = __importDefault(require("front/DeleteButton"));
const date_1 = require("front/date");
const useLoggedInUser_1 = __importDefault(require("front/useLoggedInUser"));
const routes_1 = __importDefault(require("front/routes"));
const Comment = ({ comment }) => {
    const loggedInUser = (0, useLoggedInUser_1.default)();
    const canModify = loggedInUser && loggedInUser?.username === comment?.author?.username;
    return (<div className="card">
      <div className="card-block">{comment.body}</div>
      <div className="card-footer">
        <CustomLink_1.default href={routes_1.default.userView(comment.author.username)} className="comment-author">
          <CustomImage_1.default src={comment.author.image} alt="author profile image" className="comment-author-img"/>
        </CustomLink_1.default>
        &nbsp;
        <CustomLink_1.default href={routes_1.default.userView(comment.author.username)} className="comment-author">
          {comment.author.username}
        </CustomLink_1.default>
        <span className="date-posted">{(0, date_1.formatDate)(comment.createdAt)}</span>
        <Maybe_1.default test={canModify}>
          <DeleteButton_1.default commentId={comment.id}/>
        </Maybe_1.default>
      </div>
    </div>);
};
exports.default = Comment;
//# sourceMappingURL=Comment.js.map