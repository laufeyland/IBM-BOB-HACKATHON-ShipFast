"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const CustomLink_1 = __importDefault(require("front/CustomLink"));
const Maybe_1 = __importDefault(require("front/Maybe"));
const routes_1 = __importDefault(require("front/routes"));
const EditProfileButton = ({ isCurrentUser }) => (<Maybe_1.default test={isCurrentUser}>
    <CustomLink_1.default href={routes_1.default.userEdit()} className="btn btn-sm btn-outline-secondary action-btn">
      <i className="ion-gear-a"/> Edit Profile Settings
    </CustomLink_1.default>
  </Maybe_1.default>);
exports.default = EditProfileButton;
//# sourceMappingURL=EditProfileButton.js.map