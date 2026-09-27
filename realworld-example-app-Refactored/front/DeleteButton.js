"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const router_1 = require("next/router");
const swr_1 = require("swr");
const config_1 = require("front/config");
const useLoggedInUser_1 = __importDefault(require("front/useLoggedInUser"));
const DeleteButton = ({ commentId }) => {
    const loggedInUser = (0, useLoggedInUser_1.default)();
    const router = (0, router_1.useRouter)();
    const { query: { pid }, } = router;
    const handleDelete = async (commentId) => {
        await axios_1.default.delete(`${config_1.apiPath}/articles/${pid}/comments/${commentId}`, {
            headers: {
                Authorization: `Token ${loggedInUser?.token}`,
            },
        });
        (0, swr_1.trigger)(`${config_1.apiPath}/articles/${pid}/comments`);
    };
    return (<span className="mod-options">
      <i className="ion-trash-a" onClick={() => handleDelete(commentId)}/>
    </span>);
};
exports.default = DeleteButton;
//# sourceMappingURL=DeleteButton.js.map