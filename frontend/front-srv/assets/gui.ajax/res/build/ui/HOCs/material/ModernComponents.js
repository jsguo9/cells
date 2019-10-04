/*
 * Copyright 2007-2019 Charles du Jeu - Abstrium SAS <team (at) pyd.io>
 * This file is part of Pydio.
 *
 * Pydio is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Pydio is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Pydio.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The latest code can be found at <https://pydio.com>.
 */
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _materialUi = require('material-ui');

var noWrap = {
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
};

var styles = {
    textField: {
        inputStyle: { backgroundColor: 'rgba(224, 224, 224, 0.33)', height: 34, borderRadius: 3, marginTop: 6, padding: 7 },
        hintStyle: _extends({ paddingLeft: 7, color: 'rgba(0,0,0,0.5)' }, noWrap, { width: '100%' }),
        underlineStyle: { opacity: 0 },
        underlineFocusStyle: { opacity: 1, borderRadius: '0px 0px 3px 3px' },
        errorStyle: { bottom: -4 }
    },
    textareaField: {
        rows: 4,
        rowsMax: 4,
        inputStyle: { backgroundColor: 'rgba(224, 224, 224, 0.33)', height: 106, borderRadius: 3, marginTop: 6, padding: 7 },
        textareaStyle: { marginTop: 0, marginBottom: 0 },
        hintStyle: _extends({ paddingLeft: 7, color: 'rgba(0,0,0,0.5)' }, noWrap, { width: '100%', top: 12, bottom: 'inherit' }),
        underlineStyle: { opacity: 0 },
        underlineFocusStyle: { opacity: 1, borderRadius: '0px 0px 3px 3px' }
    },
    selectField: {
        style: { backgroundColor: 'rgba(224, 224, 224, 0.33)', height: 34, borderRadius: 3, marginTop: 6, padding: 7, paddingRight: 0, overflow: 'hidden' },
        menuStyle: { marginTop: -12 },
        hintStyle: _extends({ paddingLeft: 0, marginBottom: -7, paddingRight: 56, color: 'rgba(0,0,0,0.34)' }, noWrap, { width: '100%' }),
        underlineShow: false
    },
    div: {
        backgroundColor: 'rgba(224, 224, 224, 0.33)', color: 'rgba(0,0,0,.5)',
        height: 34, borderRadius: 3, marginTop: 6, padding: 7, paddingRight: 0
    },
    toggleField: {
        style: {
            backgroundColor: 'rgba(224, 224, 224, 0.33)',
            padding: '7px 5px 4px',
            borderRadius: 3,
            fontSize: 15
        }
    }
};

function withModernTheme(formComponent) {
    var ModernThemeComponent = (function (_React$Component) {
        _inherits(ModernThemeComponent, _React$Component);

        function ModernThemeComponent() {
            _classCallCheck(this, ModernThemeComponent);

            _React$Component.apply(this, arguments);
        }

        ModernThemeComponent.prototype.mergedProps = function mergedProps(styleProps) {
            var props = this.props;
            Object.keys(props).forEach(function (k) {
                if (styleProps[k]) {
                    styleProps[k] = _extends({}, styleProps[k], props[k]);
                }
            });
            return styleProps;
        };

        ModernThemeComponent.prototype.componentDidMount = function componentDidMount() {
            if (this.props.focusOnMount && this.refs.component) {
                this.refs.component.focus();
            }
        };

        ModernThemeComponent.prototype.focus = function focus() {
            if (this.refs.component) {
                this.refs.component.focus();
            }
        };

        ModernThemeComponent.prototype.getInput = function getInput() {
            if (this.refs.component) {
                return this.refs.component.input;
            }
        };

        ModernThemeComponent.prototype.getValue = function getValue() {
            return this.refs.component.getValue();
        };

        ModernThemeComponent.prototype.render = function render() {
            var _props = this.props;
            var floatingLabelText = _props.floatingLabelText;

            var otherProps = _objectWithoutProperties(_props, ['floatingLabelText']);

            if (floatingLabelText) {
                otherProps["hintText"] = floatingLabelText;
            }

            if (formComponent === _materialUi.TextField) {
                var styleProps = undefined;
                if (this.props.multiLine) {
                    styleProps = this.mergedProps(_extends({}, styles.textareaField));
                } else {
                    styleProps = this.mergedProps(_extends({}, styles.textField));
                }
                return _react2['default'].createElement(_materialUi.TextField, _extends({}, otherProps, styleProps, { ref: "component" }));
            } else if (formComponent === _materialUi.SelectField) {
                var styleProps = this.mergedProps(_extends({}, styles.selectField));
                return _react2['default'].createElement(_materialUi.SelectField, _extends({}, otherProps, styleProps, { ref: "component" }));
            } else {
                return formComponent;
            }
        };

        return ModernThemeComponent;
    })(_react2['default'].Component);

    return ModernThemeComponent;
}

var ModernTextField = withModernTheme(_materialUi.TextField);
var ModernSelectField = withModernTheme(_materialUi.SelectField);
exports.ModernTextField = ModernTextField;
exports.ModernSelectField = ModernSelectField;
exports.withModernTheme = withModernTheme;
exports.ModernStyles = styles;
