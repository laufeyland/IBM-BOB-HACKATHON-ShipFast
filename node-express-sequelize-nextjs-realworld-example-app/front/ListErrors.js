"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const ListErrors = ({ errors }) => (<ul className="error-messages">
    {Object.keys(errors).map((key) => {
        return (<li key={key}>
          {key}:
          <ul>
            <li>{errors[key]}</li>
          </ul>
        </li>);
    })}
  </ul>);
exports.default = ListErrors;
//# sourceMappingURL=ListErrors.js.map