"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("front/config");
const react_1 = __importDefault(require("react"));
const TagInput = ({ tagList, addTag, removeTag }) => {
    const [tag, setTag] = react_1.default.useState('');
    const changeTagInput = (e) => setTag(e.target.value);
    const handleTagInputKeyDown = (e) => {
        switch (e.keyCode) {
            case 13: // Enter
            case 9: // Tab
            case 188: // Comma
                if (e.keyCode !== 9)
                    e.preventDefault();
                handleAddTag();
                break;
            default:
                break;
        }
    };
    const handleAddTag = () => {
        if (tag) {
            addTag(tag);
            setTag('');
        }
    };
    const handleRemoveTag = (tag) => {
        removeTag(tag);
    };
    return (<>
      <fieldset className="form-group">
        <input className="form-control" type="text" placeholder={config_1.isDemo ? 'Press Enter, Tab or Comma to add a tag' : 'Enter tags'} value={tag} onChange={changeTagInput} onBlur={handleAddTag} onKeyDown={handleTagInputKeyDown}/>
        <div className="tag-list">
          {tagList.map((tag, index) => (<span className="tag-default tag-pill" key={index}>
              <i className="ion-close-round" onClick={() => handleRemoveTag(tag)}/>
              {tag}
            </span>))}
        </div>
      </fieldset>
    </>);
};
exports.default = TagInput;
//# sourceMappingURL=TagInput.js.map