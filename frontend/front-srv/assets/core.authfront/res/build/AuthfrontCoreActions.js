(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.AuthfrontCoreActions = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*
 * Copyright 2007-2017 Charles du Jeu - Abstrium SAS <team (at) pyd.io>
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

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _materialUiStyles = require('material-ui/styles');

var _materialUi = require('material-ui');

var _pydioHttpApi = require("pydio/http/api");

var _pydioHttpApi2 = _interopRequireDefault(_pydioHttpApi);

var _pydioHttpRestApi = require("pydio/http/rest-api");

var pydio = window.pydio;

var LanguagePicker = function LanguagePicker() {
    var items = [];

    pydio.listLanguagesWithCallback(function (key, label, current) {
        return items.push(React.createElement(_materialUi.MenuItem, {
            primaryText: label,
            value: key,
            rightIcon: current ? React.createElement(_materialUi.FontIcon, { className: 'mdi mdi-check' }) : null
        }));
    });

    return React.createElement(
        _materialUi.IconMenu,
        {
            iconButtonElement: React.createElement(_materialUi.IconButton, { tooltip: pydio.MessageHash[618], iconClassName: 'mdi mdi-flag-outline-variant', iconStyle: { fontSize: 20, color: 'rgba(255,255,255,.67)' } }),
            onItemTouchTap: function (e, o) {
                pydio.loadI18NMessages(o.props.value);
            },
            desktop: true
        },
        items
    );
};

var LoginDialogMixin = {

    getInitialState: function getInitialState() {
        return {
            globalParameters: pydio.Parameters,
            authParameters: pydio.getPluginConfigs('auth'),
            errorId: null,
            displayCaptcha: false
        };
    },

    postLoginData: function postLoginData(restClient) {
        var _this = this;

        var passwordOnly = this.state.globalParameters.get('PASSWORD_AUTH_ONLY');
        var login = undefined;
        if (passwordOnly) {
            login = this.state.globalParameters.get('PRESET_LOGIN');
        } else {
            login = this.refs.login.getValue();
        }
        restClient.jwtFromCredentials(login, this.refs.password.getValue()).then(function (r) {
            if (r.data && r.data.Trigger) {
                return;
            }

            _this.dismiss();
        })['catch'](function (e) {
            if (e.response && e.response.body) {
                _this.setState({ errorId: e.response.body.Title });
            } else if (e.response && e.response.text) {
                _this.setState({ errorId: e.response.text });
            } else if (e.message) {
                _this.setState({ errorId: e.message });
            } else {
                _this.setState({ errorId: 'Login failed!' });
            }
        });
    }
};

var LoginPasswordDialog = React.createClass({
    displayName: 'LoginPasswordDialog',

    mixins: [PydioReactUI.ActionDialogMixin, PydioReactUI.SubmitButtonProviderMixin, LoginDialogMixin],

    getDefaultProps: function getDefaultProps() {
        return {
            dialogTitle: '', //pydio.MessageHash[163],
            dialogIsModal: true,
            dialogSize: 'sm'
        };
    },

    getInitialState: function getInitialState() {
        return { rememberChecked: false };
    },

    submit: function submit() {
        var client = _pydioHttpApi2['default'].getRestClient();
        this.postLoginData(client);
    },

    fireForgotPassword: function fireForgotPassword(e) {
        e.stopPropagation();
        pydio.getController().fireAction(this.state.authParameters.get("FORGOT_PASSWORD_ACTION"));
    },

    useBlur: function useBlur() {
        return true;
    },

    getButtons: function getButtons() {
        var _this2 = this;

        var passwordOnly = this.state.globalParameters.get('PASSWORD_AUTH_ONLY');
        var secureLoginForm = passwordOnly || this.state.authParameters.get('SECURE_LOGIN_FORM');

        var enterButton = React.createElement(_materialUi.FlatButton, { id: 'dialog-login-submit', 'default': true, labelStyle: { color: 'white' }, key: 'enter', label: pydio.MessageHash[617], onTouchTap: function () {
                return _this2.submit();
            } });
        var buttons = [];
        if (false && !secureLoginForm) {
            buttons.push(React.createElement(
                DarkThemeContainer,
                { key: 'remember', style: { flex: 1, textAlign: 'left', paddingLeft: 16 } },
                React.createElement(_materialUi.Checkbox, { label: pydio.MessageHash[261], labelStyle: { fontSize: 13 }, onCheck: function (e, c) {
                        _this2.setState({ rememberChecked: c });
                    } })
            ));
            buttons.push(enterButton);
            return [React.createElement(
                'div',
                { style: { display: 'flex', alignItems: 'center' } },
                buttons
            )];
        } else {
            return [enterButton];
        }
    },

    render: function render() {
        var _this3 = this;

        var passwordOnly = this.state.globalParameters.get('PASSWORD_AUTH_ONLY');
        var secureLoginForm = passwordOnly || this.state.authParameters.get('SECURE_LOGIN_FORM');
        var forgotPasswordLink = this.state.authParameters.get('ENABLE_FORGOT_PASSWORD') && !passwordOnly;

        var errorMessage = undefined;
        if (this.state.errorId) {
            errorMessage = React.createElement(
                'div',
                { className: 'ajxp_login_error' },
                this.state.errorId
            );
        }
        var forgotLink = undefined;
        if (forgotPasswordLink) {
            forgotLink = React.createElement(
                'div',
                { className: 'forgot-password-link' },
                React.createElement(
                    'a',
                    { style: { cursor: 'pointer' }, onClick: this.fireForgotPassword },
                    pydio.MessageHash[479]
                )
            );
        }
        var additionalComponentsTop = undefined,
            additionalComponentsBottom = undefined;
        if (this.props.modifiers) {
            (function () {
                var comps = { top: [], bottom: [] };
                _this3.props.modifiers.map((function (m) {
                    m.renderAdditionalComponents(this.props, this.state, comps);
                }).bind(_this3));
                if (comps.top.length) {
                    additionalComponentsTop = React.createElement(
                        'div',
                        null,
                        comps.top
                    );
                }
                if (comps.bottom.length) {
                    additionalComponentsBottom = React.createElement(
                        'div',
                        null,
                        comps.bottom
                    );
                }
            })();
        }

        var custom = this.props.pydio.Parameters.get('customWording');
        var logoUrl = custom.icon;
        if (custom.iconBinary) {
            logoUrl = pydio.Parameters.get('ENDPOINT_REST_API') + "/frontend/binaries/GLOBAL/" + custom.iconBinary;
        }

        var logoStyle = {
            backgroundSize: 'contain',
            backgroundImage: 'url(' + logoUrl + ')',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            position: 'absolute',
            top: -130,
            left: 0,
            width: 320,
            height: 120
        };

        return React.createElement(
            DarkThemeContainer,
            null,
            logoUrl && React.createElement('div', { style: logoStyle }),
            React.createElement(
                'div',
                { className: 'dialogLegend', style: { fontSize: 22, paddingBottom: 12, lineHeight: '28px' } },
                pydio.MessageHash[passwordOnly ? 552 : 180],
                React.createElement(LanguagePicker, null)
            ),
            errorMessage,
            additionalComponentsTop,
            React.createElement(
                'form',
                { autoComplete: secureLoginForm ? "off" : "on" },
                !passwordOnly && React.createElement(_materialUi.TextField, {
                    className: 'blurDialogTextField',
                    autoComplete: secureLoginForm ? "off" : "on",
                    floatingLabelText: pydio.MessageHash[181],
                    ref: 'login',
                    onKeyDown: this.submitOnEnterKey,
                    fullWidth: true,
                    id: 'application-login'
                }),
                React.createElement(_materialUi.TextField, {
                    id: 'application-password',
                    className: 'blurDialogTextField',
                    autoComplete: secureLoginForm ? "off" : "on",
                    type: 'password',
                    floatingLabelText: pydio.MessageHash[182],
                    ref: 'password',
                    onKeyDown: this.submitOnEnterKey,
                    fullWidth: true
                })
            ),
            additionalComponentsBottom,
            forgotLink
        );
    }

});

var DarkThemeContainer = (function (_React$Component) {
    _inherits(DarkThemeContainer, _React$Component);

    function DarkThemeContainer() {
        _classCallCheck(this, DarkThemeContainer);

        _get(Object.getPrototypeOf(DarkThemeContainer.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(DarkThemeContainer, [{
        key: 'render',
        value: function render() {
            var _props = this.props;
            var muiTheme = _props.muiTheme;

            var props = _objectWithoutProperties(_props, ['muiTheme']);

            var baseTheme = _extends({}, _materialUiStyles.darkBaseTheme);
            baseTheme.palette.primary1Color = muiTheme.palette.accent1Color;
            var darkTheme = (0, _materialUiStyles.getMuiTheme)(baseTheme);

            return React.createElement(
                _materialUi.MuiThemeProvider,
                { muiTheme: darkTheme },
                React.createElement('div', props)
            );
        }
    }]);

    return DarkThemeContainer;
})(React.Component);

DarkThemeContainer = (0, _materialUiStyles.muiThemeable)()(DarkThemeContainer);

var MultiAuthSelector = React.createClass({
    displayName: 'MultiAuthSelector',

    getValue: function getValue() {
        return this.state.value;
    },

    getInitialState: function getInitialState() {
        return { value: Object.keys(this.props.authSources).shift() };
    },

    onChange: function onChange(object, key, payload) {
        this.setState({ value: payload });
    },

    render: function render() {
        var menuItems = [];
        for (var key in this.props.authSources) {
            menuItems.push(React.createElement(_materialUi.MenuItem, { value: key, primaryText: this.props.authSources[key] }));
        }
        return React.createElement(
            _materialUi.SelectField,
            {
                value: this.state.value,
                onChange: this.onChange,
                floatingLabelText: 'Login as...'
            },
            menuItems
        );
    }
});

var MultiAuthModifier = (function (_PydioReactUI$AbstractDialogModifier) {
    _inherits(MultiAuthModifier, _PydioReactUI$AbstractDialogModifier);

    function MultiAuthModifier() {
        _classCallCheck(this, MultiAuthModifier);

        _get(Object.getPrototypeOf(MultiAuthModifier.prototype), 'constructor', this).call(this);
    }

    _createClass(MultiAuthModifier, [{
        key: 'enrichSubmitParameters',
        value: function enrichSubmitParameters(props, state, refs, params) {

            var selectedSource = refs.multi_selector.getValue();
            params['auth_source'] = selectedSource;
            if (props.masterAuthSource && selectedSource === props.masterAuthSource) {
                params['userid'] = selectedSource + props.userIdSeparator + params['userid'];
            }
        }
    }, {
        key: 'renderAdditionalComponents',
        value: function renderAdditionalComponents(props, state, accumulator) {

            if (!props.authSources) {
                console.error('Could not find authSources');
                return;
            }
            accumulator.top.push(React.createElement(MultiAuthSelector, _extends({ ref: 'multi_selector' }, props, { parentState: state })));
        }
    }]);

    return MultiAuthModifier;
})(PydioReactUI.AbstractDialogModifier);

var Callbacks = (function () {
    function Callbacks() {
        _classCallCheck(this, Callbacks);
    }

    _createClass(Callbacks, null, [{
        key: 'sessionLogout',
        value: function sessionLogout() {

            if (Pydio.getInstance().Parameters.get("PRELOG_USER")) {
                return;
            }

            _pydioHttpApi2['default'].getRestClient().sessionLogout()['finally'](function (e) {
                return window.location.href = pydio.Parameters.get('FRONTEND_URL') + '/logout';
            });
        }
    }, {
        key: 'loginPassword',
        value: function loginPassword(manager) {
            var args = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

            if (Pydio.getInstance().Parameters.get("PRELOG_USER")) {
                return;
            }

            var _ref = args[0] || {};

            var _ref$createAuthRequest = _ref.createAuthRequest;
            var createAuthRequest = _ref$createAuthRequest === undefined ? true : _ref$createAuthRequest;

            var props = _objectWithoutProperties(_ref, ['createAuthRequest']);

            var fn = function fn() {
                return pydio.UI.openComponentInModal('AuthfrontCoreActions', 'LoginPasswordDialog', _extends({}, props, { blur: true }));
            };

            if (createAuthRequest) {
                _pydioHttpApi2['default'].getRestClient().jwtWithAuthInfo({ type: "create_auth_request" }).then(fn);
            } else {
                fn();
            }
        }
    }]);

    return Callbacks;
})();

var ResetPasswordRequire = React.createClass({
    displayName: 'ResetPasswordRequire',

    mixins: [PydioReactUI.ActionDialogMixin, PydioReactUI.SubmitButtonProviderMixin, PydioReactUI.CancelButtonProviderMixin],

    statics: {
        open: function open() {
            pydio.UI.openComponentInModal('AuthfrontCoreActions', 'ResetPasswordRequire', { blur: true });
        }
    },

    getDefaultProps: function getDefaultProps() {
        return {
            dialogTitle: pydio.MessageHash['gui.user.1'],
            dialogIsModal: true,
            dialogSize: 'sm'
        };
    },

    useBlur: function useBlur() {
        return true;
    },

    cancel: function cancel() {
        pydio.Controller.fireAction('login');
    },

    submit: function submit() {
        var _this4 = this;

        var valueSubmitted = this.state && this.state.valueSubmitted;
        if (valueSubmitted) {
            this.cancel();
        }
        var value = this.refs.input && this.refs.input.getValue();
        if (!value) {
            return;
        }

        var api = new _pydioHttpRestApi.TokenServiceApi(_pydioHttpApi2['default'].getRestClient());
        api.resetPasswordToken(value).then(function () {
            _this4.setState({ valueSubmitted: true });
        });
    },

    render: function render() {
        var mess = this.props.pydio.MessageHash;
        var valueSubmitted = this.state && this.state.valueSubmitted;
        return React.createElement(
            'div',
            null,
            !valueSubmitted && React.createElement(
                'div',
                null,
                React.createElement(
                    'div',
                    { className: 'dialogLegend' },
                    mess['gui.user.3']
                ),
                React.createElement(_materialUi.TextField, {
                    className: 'blurDialogTextField',
                    ref: 'input',
                    fullWidth: true,
                    floatingLabelText: mess['gui.user.4']
                })
            ),
            valueSubmitted && React.createElement(
                'div',
                null,
                mess['gui.user.5']
            )
        );
    }

});

var ResetPasswordDialog = React.createClass({
    displayName: 'ResetPasswordDialog',

    mixins: [PydioReactUI.ActionDialogMixin, PydioReactUI.SubmitButtonProviderMixin],

    statics: {
        open: function open() {
            pydio.UI.openComponentInModal('AuthfrontCoreActions', 'ResetPasswordDialog', { blur: true });
        }
    },

    getDefaultProps: function getDefaultProps() {
        return {
            dialogTitle: pydio.MessageHash['gui.user.1'],
            dialogIsModal: true,
            dialogSize: 'sm'
        };
    },

    getInitialState: function getInitialState() {
        return { valueSubmitted: false, formLoaded: false, passValue: null, userId: null };
    },

    useBlur: function useBlur() {
        return true;
    },

    submit: function submit() {
        var _this5 = this;

        var pydio = this.props.pydio;

        if (this.state.valueSubmitted) {
            this.props.onDismiss();
            window.location.href = pydio.Parameters.get('FRONTEND_URL') + '/login';
            return;
        }

        var mess = pydio.MessageHash;
        var api = new _pydioHttpRestApi.TokenServiceApi(_pydioHttpApi2['default'].getRestClient());
        var request = new _pydioHttpRestApi.RestResetPasswordRequest();
        request.UserLogin = this.state.userId;
        request.ResetPasswordToken = pydio.Parameters.get('USER_ACTION_KEY');
        request.NewPassword = this.state.passValue;
        api.resetPassword(request).then(function () {
            _this5.setState({ valueSubmitted: true });
        })['catch'](function (e) {
            alert(mess[240]);
        });
    },

    componentDidMount: function componentDidMount() {
        var _this6 = this;

        Promise.resolve(require('pydio').requireLib('form', true)).then(function () {
            _this6.setState({ formLoaded: true });
        });
    },

    onPassChange: function onPassChange(newValue, oldValue) {
        this.setState({ passValue: newValue });
    },

    onUserIdChange: function onUserIdChange(event, newValue) {
        this.setState({ userId: newValue });
    },

    render: function render() {
        var mess = this.props.pydio.MessageHash;
        var _state = this.state;
        var valueSubmitted = _state.valueSubmitted;
        var formLoaded = _state.formLoaded;
        var passValue = _state.passValue;
        var userId = _state.userId;

        if (!valueSubmitted && formLoaded) {

            return React.createElement(
                'div',
                null,
                React.createElement(
                    'div',
                    { className: 'dialogLegend' },
                    mess['gui.user.8']
                ),
                React.createElement(_materialUi.TextField, {
                    className: 'blurDialogTextField',
                    value: userId,
                    floatingLabelText: mess['gui.user.4'],
                    onChange: this.onUserIdChange.bind(this)
                }),
                React.createElement(PydioForm.ValidPassword, {
                    className: 'blurDialogTextField',
                    onChange: this.onPassChange.bind(this),
                    attributes: { name: 'password', label: mess[198] },
                    value: passValue
                })
            );
        } else if (valueSubmitted) {

            return React.createElement(
                'div',
                null,
                mess['gui.user.6']
            );
        } else {
            return React.createElement(PydioReactUI.Loader, null);
        }
    }

});

exports.Callbacks = Callbacks;
exports.LoginPasswordDialog = LoginPasswordDialog;
exports.ResetPasswordRequire = ResetPasswordRequire;
exports.ResetPasswordDialog = ResetPasswordDialog;
exports.MultiAuthModifier = MultiAuthModifier;
exports.LanguagePicker = LanguagePicker;

},{"material-ui":"material-ui","material-ui/styles":"material-ui/styles","pydio":"pydio","pydio/http/api":"pydio/http/api","pydio/http/rest-api":"pydio/http/rest-api"}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJyZXMvYnVpbGQvQ29yZUFjdGlvbnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qXG4gKiBDb3B5cmlnaHQgMjAwNy0yMDE3IENoYXJsZXMgZHUgSmV1IC0gQWJzdHJpdW0gU0FTIDx0ZWFtIChhdCkgcHlkLmlvPlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgUHlkaW8uXG4gKlxuICogUHlkaW8gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgQWZmZXJvIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBQeWRpbyBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBBZmZlcm8gR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBBZmZlcm8gR2VuZXJhbCBQdWJsaWMgTGljZW5zZVxuICogYWxvbmcgd2l0aCBQeWRpby4gIElmIG5vdCwgc2VlIDxodHRwOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqXG4gKiBUaGUgbGF0ZXN0IGNvZGUgY2FuIGJlIGZvdW5kIGF0IDxodHRwczovL3B5ZGlvLmNvbT4uXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG52YXIgX2NyZWF0ZUNsYXNzID0gKGZ1bmN0aW9uICgpIHsgZnVuY3Rpb24gZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHsgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTsgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlOyBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7IGlmICgndmFsdWUnIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfSByZXR1cm4gZnVuY3Rpb24gKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IsIHN0YXRpY1Byb3BzKTsgcmV0dXJuIENvbnN0cnVjdG9yOyB9OyB9KSgpO1xuXG52YXIgX2dldCA9IGZ1bmN0aW9uIGdldChfeDIsIF94MywgX3g0KSB7IHZhciBfYWdhaW4gPSB0cnVlOyBfZnVuY3Rpb246IHdoaWxlIChfYWdhaW4pIHsgdmFyIG9iamVjdCA9IF94MiwgcHJvcGVydHkgPSBfeDMsIHJlY2VpdmVyID0gX3g0OyBfYWdhaW4gPSBmYWxzZTsgaWYgKG9iamVjdCA9PT0gbnVsbCkgb2JqZWN0ID0gRnVuY3Rpb24ucHJvdG90eXBlOyB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqZWN0LCBwcm9wZXJ0eSk7IGlmIChkZXNjID09PSB1bmRlZmluZWQpIHsgdmFyIHBhcmVudCA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihvYmplY3QpOyBpZiAocGFyZW50ID09PSBudWxsKSB7IHJldHVybiB1bmRlZmluZWQ7IH0gZWxzZSB7IF94MiA9IHBhcmVudDsgX3gzID0gcHJvcGVydHk7IF94NCA9IHJlY2VpdmVyOyBfYWdhaW4gPSB0cnVlOyBkZXNjID0gcGFyZW50ID0gdW5kZWZpbmVkOyBjb250aW51ZSBfZnVuY3Rpb247IH0gfSBlbHNlIGlmICgndmFsdWUnIGluIGRlc2MpIHsgcmV0dXJuIGRlc2MudmFsdWU7IH0gZWxzZSB7IHZhciBnZXR0ZXIgPSBkZXNjLmdldDsgaWYgKGdldHRlciA9PT0gdW5kZWZpbmVkKSB7IHJldHVybiB1bmRlZmluZWQ7IH0gcmV0dXJuIGdldHRlci5jYWxsKHJlY2VpdmVyKTsgfSB9IH07XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH1cblxuZnVuY3Rpb24gX29iamVjdFdpdGhvdXRQcm9wZXJ0aWVzKG9iaiwga2V5cykgeyB2YXIgdGFyZ2V0ID0ge307IGZvciAodmFyIGkgaW4gb2JqKSB7IGlmIChrZXlzLmluZGV4T2YoaSkgPj0gMCkgY29udGludWU7IGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgaSkpIGNvbnRpbnVlOyB0YXJnZXRbaV0gPSBvYmpbaV07IH0gcmV0dXJuIHRhcmdldDsgfVxuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvbicpOyB9IH1cblxuZnVuY3Rpb24gX2luaGVyaXRzKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7IGlmICh0eXBlb2Ygc3VwZXJDbGFzcyAhPT0gJ2Z1bmN0aW9uJyAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoJ1N1cGVyIGV4cHJlc3Npb24gbXVzdCBlaXRoZXIgYmUgbnVsbCBvciBhIGZ1bmN0aW9uLCBub3QgJyArIHR5cGVvZiBzdXBlckNsYXNzKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCBlbnVtZXJhYmxlOiBmYWxzZSwgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9IH0pOyBpZiAoc3VwZXJDbGFzcykgT2JqZWN0LnNldFByb3RvdHlwZU9mID8gT2JqZWN0LnNldFByb3RvdHlwZU9mKHN1YkNsYXNzLCBzdXBlckNsYXNzKSA6IHN1YkNsYXNzLl9fcHJvdG9fXyA9IHN1cGVyQ2xhc3M7IH1cblxudmFyIF9tYXRlcmlhbFVpU3R5bGVzID0gcmVxdWlyZSgnbWF0ZXJpYWwtdWkvc3R5bGVzJyk7XG5cbnZhciBfbWF0ZXJpYWxVaSA9IHJlcXVpcmUoJ21hdGVyaWFsLXVpJyk7XG5cbnZhciBfcHlkaW9IdHRwQXBpID0gcmVxdWlyZShcInB5ZGlvL2h0dHAvYXBpXCIpO1xuXG52YXIgX3B5ZGlvSHR0cEFwaTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9weWRpb0h0dHBBcGkpO1xuXG52YXIgX3B5ZGlvSHR0cFJlc3RBcGkgPSByZXF1aXJlKFwicHlkaW8vaHR0cC9yZXN0LWFwaVwiKTtcblxudmFyIHB5ZGlvID0gd2luZG93LnB5ZGlvO1xuXG52YXIgTGFuZ3VhZ2VQaWNrZXIgPSBmdW5jdGlvbiBMYW5ndWFnZVBpY2tlcigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXTtcblxuICAgIHB5ZGlvLmxpc3RMYW5ndWFnZXNXaXRoQ2FsbGJhY2soZnVuY3Rpb24gKGtleSwgbGFiZWwsIGN1cnJlbnQpIHtcbiAgICAgICAgcmV0dXJuIGl0ZW1zLnB1c2goUmVhY3QuY3JlYXRlRWxlbWVudChfbWF0ZXJpYWxVaS5NZW51SXRlbSwge1xuICAgICAgICAgICAgcHJpbWFyeVRleHQ6IGxhYmVsLFxuICAgICAgICAgICAgdmFsdWU6IGtleSxcbiAgICAgICAgICAgIHJpZ2h0SWNvbjogY3VycmVudCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoX21hdGVyaWFsVWkuRm9udEljb24sIHsgY2xhc3NOYW1lOiAnbWRpIG1kaS1jaGVjaycgfSkgOiBudWxsXG4gICAgICAgIH0pKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuICAgICAgICBfbWF0ZXJpYWxVaS5JY29uTWVudSxcbiAgICAgICAge1xuICAgICAgICAgICAgaWNvbkJ1dHRvbkVsZW1lbnQ6IFJlYWN0LmNyZWF0ZUVsZW1lbnQoX21hdGVyaWFsVWkuSWNvbkJ1dHRvbiwgeyB0b29sdGlwOiBweWRpby5NZXNzYWdlSGFzaFs2MThdLCBpY29uQ2xhc3NOYW1lOiAnbWRpIG1kaS1mbGFnLW91dGxpbmUtdmFyaWFudCcsIGljb25TdHlsZTogeyBmb250U2l6ZTogMjAsIGNvbG9yOiAncmdiYSgyNTUsMjU1LDI1NSwuNjcpJyB9IH0pLFxuICAgICAgICAgICAgb25JdGVtVG91Y2hUYXA6IGZ1bmN0aW9uIChlLCBvKSB7XG4gICAgICAgICAgICAgICAgcHlkaW8ubG9hZEkxOE5NZXNzYWdlcyhvLnByb3BzLnZhbHVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZXNrdG9wOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIGl0ZW1zXG4gICAgKTtcbn07XG5cbnZhciBMb2dpbkRpYWxvZ01peGluID0ge1xuXG4gICAgZ2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiBnZXRJbml0aWFsU3RhdGUoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBnbG9iYWxQYXJhbWV0ZXJzOiBweWRpby5QYXJhbWV0ZXJzLFxuICAgICAgICAgICAgYXV0aFBhcmFtZXRlcnM6IHB5ZGlvLmdldFBsdWdpbkNvbmZpZ3MoJ2F1dGgnKSxcbiAgICAgICAgICAgIGVycm9ySWQ6IG51bGwsXG4gICAgICAgICAgICBkaXNwbGF5Q2FwdGNoYTogZmFsc2VcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgcG9zdExvZ2luRGF0YTogZnVuY3Rpb24gcG9zdExvZ2luRGF0YShyZXN0Q2xpZW50KSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgICAgdmFyIHBhc3N3b3JkT25seSA9IHRoaXMuc3RhdGUuZ2xvYmFsUGFyYW1ldGVycy5nZXQoJ1BBU1NXT1JEX0FVVEhfT05MWScpO1xuICAgICAgICB2YXIgbG9naW4gPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChwYXNzd29yZE9ubHkpIHtcbiAgICAgICAgICAgIGxvZ2luID0gdGhpcy5zdGF0ZS5nbG9iYWxQYXJhbWV0ZXJzLmdldCgnUFJFU0VUX0xPR0lOJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2dpbiA9IHRoaXMucmVmcy5sb2dpbi5nZXRWYWx1ZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJlc3RDbGllbnQuand0RnJvbUNyZWRlbnRpYWxzKGxvZ2luLCB0aGlzLnJlZnMucGFzc3dvcmQuZ2V0VmFsdWUoKSkudGhlbihmdW5jdGlvbiAocikge1xuICAgICAgICAgICAgaWYgKHIuZGF0YSAmJiByLmRhdGEuVHJpZ2dlcikge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgX3RoaXMuZGlzbWlzcygpO1xuICAgICAgICB9KVsnY2F0Y2gnXShmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgaWYgKGUucmVzcG9uc2UgJiYgZS5yZXNwb25zZS5ib2R5KSB7XG4gICAgICAgICAgICAgICAgX3RoaXMuc2V0U3RhdGUoeyBlcnJvcklkOiBlLnJlc3BvbnNlLmJvZHkuVGl0bGUgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUucmVzcG9uc2UgJiYgZS5yZXNwb25zZS50ZXh0KSB7XG4gICAgICAgICAgICAgICAgX3RoaXMuc2V0U3RhdGUoeyBlcnJvcklkOiBlLnJlc3BvbnNlLnRleHQgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIF90aGlzLnNldFN0YXRlKHsgZXJyb3JJZDogZS5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBfdGhpcy5zZXRTdGF0ZSh7IGVycm9ySWQ6ICdMb2dpbiBmYWlsZWQhJyB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxudmFyIExvZ2luUGFzc3dvcmREaWFsb2cgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG4gICAgZGlzcGxheU5hbWU6ICdMb2dpblBhc3N3b3JkRGlhbG9nJyxcblxuICAgIG1peGluczogW1B5ZGlvUmVhY3RVSS5BY3Rpb25EaWFsb2dNaXhpbiwgUHlkaW9SZWFjdFVJLlN1Ym1pdEJ1dHRvblByb3ZpZGVyTWl4aW4sIExvZ2luRGlhbG9nTWl4aW5dLFxuXG4gICAgZ2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkaWFsb2dUaXRsZTogJycsIC8vcHlkaW8uTWVzc2FnZUhhc2hbMTYzXSxcbiAgICAgICAgICAgIGRpYWxvZ0lzTW9kYWw6IHRydWUsXG4gICAgICAgICAgICBkaWFsb2dTaXplOiAnc20nXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gZ2V0SW5pdGlhbFN0YXRlKCkge1xuICAgICAgICByZXR1cm4geyByZW1lbWJlckNoZWNrZWQ6IGZhbHNlIH07XG4gICAgfSxcblxuICAgIHN1Ym1pdDogZnVuY3Rpb24gc3VibWl0KCkge1xuICAgICAgICB2YXIgY2xpZW50ID0gX3B5ZGlvSHR0cEFwaTJbJ2RlZmF1bHQnXS5nZXRSZXN0Q2xpZW50KCk7XG4gICAgICAgIHRoaXMucG9zdExvZ2luRGF0YShjbGllbnQpO1xuICAgIH0sXG5cbiAgICBmaXJlRm9yZ290UGFzc3dvcmQ6IGZ1bmN0aW9uIGZpcmVGb3Jnb3RQYXNzd29yZChlKSB7XG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIHB5ZGlvLmdldENvbnRyb2xsZXIoKS5maXJlQWN0aW9uKHRoaXMuc3RhdGUuYXV0aFBhcmFtZXRlcnMuZ2V0KFwiRk9SR09UX1BBU1NXT1JEX0FDVElPTlwiKSk7XG4gICAgfSxcblxuICAgIHVzZUJsdXI6IGZ1bmN0aW9uIHVzZUJsdXIoKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG5cbiAgICBnZXRCdXR0b25zOiBmdW5jdGlvbiBnZXRCdXR0b25zKCkge1xuICAgICAgICB2YXIgX3RoaXMyID0gdGhpcztcblxuICAgICAgICB2YXIgcGFzc3dvcmRPbmx5ID0gdGhpcy5zdGF0ZS5nbG9iYWxQYXJhbWV0ZXJzLmdldCgnUEFTU1dPUkRfQVVUSF9PTkxZJyk7XG4gICAgICAgIHZhciBzZWN1cmVMb2dpbkZvcm0gPSBwYXNzd29yZE9ubHkgfHwgdGhpcy5zdGF0ZS5hdXRoUGFyYW1ldGVycy5nZXQoJ1NFQ1VSRV9MT0dJTl9GT1JNJyk7XG5cbiAgICAgICAgdmFyIGVudGVyQnV0dG9uID0gUmVhY3QuY3JlYXRlRWxlbWVudChfbWF0ZXJpYWxVaS5GbGF0QnV0dG9uLCB7IGlkOiAnZGlhbG9nLWxvZ2luLXN1Ym1pdCcsICdkZWZhdWx0JzogdHJ1ZSwgbGFiZWxTdHlsZTogeyBjb2xvcjogJ3doaXRlJyB9LCBrZXk6ICdlbnRlcicsIGxhYmVsOiBweWRpby5NZXNzYWdlSGFzaFs2MTddLCBvblRvdWNoVGFwOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF90aGlzMi5zdWJtaXQoKTtcbiAgICAgICAgICAgIH0gfSk7XG4gICAgICAgIHZhciBidXR0b25zID0gW107XG4gICAgICAgIGlmIChmYWxzZSAmJiAhc2VjdXJlTG9naW5Gb3JtKSB7XG4gICAgICAgICAgICBidXR0b25zLnB1c2goUmVhY3QuY3JlYXRlRWxlbWVudChcbiAgICAgICAgICAgICAgICBEYXJrVGhlbWVDb250YWluZXIsXG4gICAgICAgICAgICAgICAgeyBrZXk6ICdyZW1lbWJlcicsIHN0eWxlOiB7IGZsZXg6IDEsIHRleHRBbGlnbjogJ2xlZnQnLCBwYWRkaW5nTGVmdDogMTYgfSB9LFxuICAgICAgICAgICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX21hdGVyaWFsVWkuQ2hlY2tib3gsIHsgbGFiZWw6IHB5ZGlvLk1lc3NhZ2VIYXNoWzI2MV0sIGxhYmVsU3R5bGU6IHsgZm9udFNpemU6IDEzIH0sIG9uQ2hlY2s6IGZ1bmN0aW9uIChlLCBjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpczIuc2V0U3RhdGUoeyByZW1lbWJlckNoZWNrZWQ6IGMgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gfSlcbiAgICAgICAgICAgICkpO1xuICAgICAgICAgICAgYnV0dG9ucy5wdXNoKGVudGVyQnV0dG9uKTtcbiAgICAgICAgICAgIHJldHVybiBbUmVhY3QuY3JlYXRlRWxlbWVudChcbiAgICAgICAgICAgICAgICAnZGl2JyxcbiAgICAgICAgICAgICAgICB7IHN0eWxlOiB7IGRpc3BsYXk6ICdmbGV4JywgYWxpZ25JdGVtczogJ2NlbnRlcicgfSB9LFxuICAgICAgICAgICAgICAgIGJ1dHRvbnNcbiAgICAgICAgICAgICldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFtlbnRlckJ1dHRvbl07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG4gICAgICAgIHZhciBwYXNzd29yZE9ubHkgPSB0aGlzLnN0YXRlLmdsb2JhbFBhcmFtZXRlcnMuZ2V0KCdQQVNTV09SRF9BVVRIX09OTFknKTtcbiAgICAgICAgdmFyIHNlY3VyZUxvZ2luRm9ybSA9IHBhc3N3b3JkT25seSB8fCB0aGlzLnN0YXRlLmF1dGhQYXJhbWV0ZXJzLmdldCgnU0VDVVJFX0xPR0lOX0ZPUk0nKTtcbiAgICAgICAgdmFyIGZvcmdvdFBhc3N3b3JkTGluayA9IHRoaXMuc3RhdGUuYXV0aFBhcmFtZXRlcnMuZ2V0KCdFTkFCTEVfRk9SR09UX1BBU1NXT1JEJykgJiYgIXBhc3N3b3JkT25seTtcblxuICAgICAgICB2YXIgZXJyb3JNZXNzYWdlID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAodGhpcy5zdGF0ZS5lcnJvcklkKSB7XG4gICAgICAgICAgICBlcnJvck1lc3NhZ2UgPSBSZWFjdC5jcmVhdGVFbGVtZW50KFxuICAgICAgICAgICAgICAgICdkaXYnLFxuICAgICAgICAgICAgICAgIHsgY2xhc3NOYW1lOiAnYWp4cF9sb2dpbl9lcnJvcicgfSxcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlLmVycm9ySWRcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGZvcmdvdExpbmsgPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChmb3Jnb3RQYXNzd29yZExpbmspIHtcbiAgICAgICAgICAgIGZvcmdvdExpbmsgPSBSZWFjdC5jcmVhdGVFbGVtZW50KFxuICAgICAgICAgICAgICAgICdkaXYnLFxuICAgICAgICAgICAgICAgIHsgY2xhc3NOYW1lOiAnZm9yZ290LXBhc3N3b3JkLWxpbmsnIH0sXG4gICAgICAgICAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudChcbiAgICAgICAgICAgICAgICAgICAgJ2EnLFxuICAgICAgICAgICAgICAgICAgICB7IHN0eWxlOiB7IGN1cnNvcjogJ3BvaW50ZXInIH0sIG9uQ2xpY2s6IHRoaXMuZmlyZUZvcmdvdFBhc3N3b3JkIH0sXG4gICAgICAgICAgICAgICAgICAgIHB5ZGlvLk1lc3NhZ2VIYXNoWzQ3OV1cbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHZhciBhZGRpdGlvbmFsQ29tcG9uZW50c1RvcCA9IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxDb21wb25lbnRzQm90dG9tID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAodGhpcy5wcm9wcy5tb2RpZmllcnMpIHtcbiAgICAgICAgICAgIChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbXBzID0geyB0b3A6IFtdLCBib3R0b206IFtdIH07XG4gICAgICAgICAgICAgICAgX3RoaXMzLnByb3BzLm1vZGlmaWVycy5tYXAoKGZ1bmN0aW9uIChtKSB7XG4gICAgICAgICAgICAgICAgICAgIG0ucmVuZGVyQWRkaXRpb25hbENvbXBvbmVudHModGhpcy5wcm9wcywgdGhpcy5zdGF0ZSwgY29tcHMpO1xuICAgICAgICAgICAgICAgIH0pLmJpbmQoX3RoaXMzKSk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBzLnRvcC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgYWRkaXRpb25hbENvbXBvbmVudHNUb3AgPSBSZWFjdC5jcmVhdGVFbGVtZW50KFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2RpdicsXG4gICAgICAgICAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcHMudG9wXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjb21wcy5ib3R0b20ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDb21wb25lbnRzQm90dG9tID0gUmVhY3QuY3JlYXRlRWxlbWVudChcbiAgICAgICAgICAgICAgICAgICAgICAgICdkaXYnLFxuICAgICAgICAgICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBzLmJvdHRvbVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY3VzdG9tID0gdGhpcy5wcm9wcy5weWRpby5QYXJhbWV0ZXJzLmdldCgnY3VzdG9tV29yZGluZycpO1xuICAgICAgICB2YXIgbG9nb1VybCA9IGN1c3RvbS5pY29uO1xuICAgICAgICBpZiAoY3VzdG9tLmljb25CaW5hcnkpIHtcbiAgICAgICAgICAgIGxvZ29VcmwgPSBweWRpby5QYXJhbWV0ZXJzLmdldCgnRU5EUE9JTlRfUkVTVF9BUEknKSArIFwiL2Zyb250ZW5kL2JpbmFyaWVzL0dMT0JBTC9cIiArIGN1c3RvbS5pY29uQmluYXJ5O1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGxvZ29TdHlsZSA9IHtcbiAgICAgICAgICAgIGJhY2tncm91bmRTaXplOiAnY29udGFpbicsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kSW1hZ2U6ICd1cmwoJyArIGxvZ29VcmwgKyAnKScsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kUG9zaXRpb246ICdjZW50ZXInLFxuICAgICAgICAgICAgYmFja2dyb3VuZFJlcGVhdDogJ25vLXJlcGVhdCcsXG4gICAgICAgICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJyxcbiAgICAgICAgICAgIHRvcDogLTEzMCxcbiAgICAgICAgICAgIGxlZnQ6IDAsXG4gICAgICAgICAgICB3aWR0aDogMzIwLFxuICAgICAgICAgICAgaGVpZ2h0OiAxMjBcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcbiAgICAgICAgICAgIERhcmtUaGVtZUNvbnRhaW5lcixcbiAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICBsb2dvVXJsICYmIFJlYWN0LmNyZWF0ZUVsZW1lbnQoJ2RpdicsIHsgc3R5bGU6IGxvZ29TdHlsZSB9KSxcbiAgICAgICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG4gICAgICAgICAgICAgICAgJ2RpdicsXG4gICAgICAgICAgICAgICAgeyBjbGFzc05hbWU6ICdkaWFsb2dMZWdlbmQnLCBzdHlsZTogeyBmb250U2l6ZTogMjIsIHBhZGRpbmdCb3R0b206IDEyLCBsaW5lSGVpZ2h0OiAnMjhweCcgfSB9LFxuICAgICAgICAgICAgICAgIHB5ZGlvLk1lc3NhZ2VIYXNoW3Bhc3N3b3JkT25seSA/IDU1MiA6IDE4MF0sXG4gICAgICAgICAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudChMYW5ndWFnZVBpY2tlciwgbnVsbClcbiAgICAgICAgICAgICksXG4gICAgICAgICAgICBlcnJvck1lc3NhZ2UsXG4gICAgICAgICAgICBhZGRpdGlvbmFsQ29tcG9uZW50c1RvcCxcbiAgICAgICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG4gICAgICAgICAgICAgICAgJ2Zvcm0nLFxuICAgICAgICAgICAgICAgIHsgYXV0b0NvbXBsZXRlOiBzZWN1cmVMb2dpbkZvcm0gPyBcIm9mZlwiIDogXCJvblwiIH0sXG4gICAgICAgICAgICAgICAgIXBhc3N3b3JkT25seSAmJiBSZWFjdC5jcmVhdGVFbGVtZW50KF9tYXRlcmlhbFVpLlRleHRGaWVsZCwge1xuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdibHVyRGlhbG9nVGV4dEZpZWxkJyxcbiAgICAgICAgICAgICAgICAgICAgYXV0b0NvbXBsZXRlOiBzZWN1cmVMb2dpbkZvcm0gPyBcIm9mZlwiIDogXCJvblwiLFxuICAgICAgICAgICAgICAgICAgICBmbG9hdGluZ0xhYmVsVGV4dDogcHlkaW8uTWVzc2FnZUhhc2hbMTgxXSxcbiAgICAgICAgICAgICAgICAgICAgcmVmOiAnbG9naW4nLFxuICAgICAgICAgICAgICAgICAgICBvbktleURvd246IHRoaXMuc3VibWl0T25FbnRlcktleSxcbiAgICAgICAgICAgICAgICAgICAgZnVsbFdpZHRoOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBpZDogJ2FwcGxpY2F0aW9uLWxvZ2luJ1xuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX21hdGVyaWFsVWkuVGV4dEZpZWxkLCB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiAnYXBwbGljYXRpb24tcGFzc3dvcmQnLFxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdibHVyRGlhbG9nVGV4dEZpZWxkJyxcbiAgICAgICAgICAgICAgICAgICAgYXV0b0NvbXBsZXRlOiBzZWN1cmVMb2dpbkZvcm0gPyBcIm9mZlwiIDogXCJvblwiLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncGFzc3dvcmQnLFxuICAgICAgICAgICAgICAgICAgICBmbG9hdGluZ0xhYmVsVGV4dDogcHlkaW8uTWVzc2FnZUhhc2hbMTgyXSxcbiAgICAgICAgICAgICAgICAgICAgcmVmOiAncGFzc3dvcmQnLFxuICAgICAgICAgICAgICAgICAgICBvbktleURvd246IHRoaXMuc3VibWl0T25FbnRlcktleSxcbiAgICAgICAgICAgICAgICAgICAgZnVsbFdpZHRoOiB0cnVlXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICksXG4gICAgICAgICAgICBhZGRpdGlvbmFsQ29tcG9uZW50c0JvdHRvbSxcbiAgICAgICAgICAgIGZvcmdvdExpbmtcbiAgICAgICAgKTtcbiAgICB9XG5cbn0pO1xuXG52YXIgRGFya1RoZW1lQ29udGFpbmVyID0gKGZ1bmN0aW9uIChfUmVhY3QkQ29tcG9uZW50KSB7XG4gICAgX2luaGVyaXRzKERhcmtUaGVtZUNvbnRhaW5lciwgX1JlYWN0JENvbXBvbmVudCk7XG5cbiAgICBmdW5jdGlvbiBEYXJrVGhlbWVDb250YWluZXIoKSB7XG4gICAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBEYXJrVGhlbWVDb250YWluZXIpO1xuXG4gICAgICAgIF9nZXQoT2JqZWN0LmdldFByb3RvdHlwZU9mKERhcmtUaGVtZUNvbnRhaW5lci5wcm90b3R5cGUpLCAnY29uc3RydWN0b3InLCB0aGlzKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cblxuICAgIF9jcmVhdGVDbGFzcyhEYXJrVGhlbWVDb250YWluZXIsIFt7XG4gICAgICAgIGtleTogJ3JlbmRlcicsXG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgICAgICAgICB2YXIgX3Byb3BzID0gdGhpcy5wcm9wcztcbiAgICAgICAgICAgIHZhciBtdWlUaGVtZSA9IF9wcm9wcy5tdWlUaGVtZTtcblxuICAgICAgICAgICAgdmFyIHByb3BzID0gX29iamVjdFdpdGhvdXRQcm9wZXJ0aWVzKF9wcm9wcywgWydtdWlUaGVtZSddKTtcblxuICAgICAgICAgICAgdmFyIGJhc2VUaGVtZSA9IF9leHRlbmRzKHt9LCBfbWF0ZXJpYWxVaVN0eWxlcy5kYXJrQmFzZVRoZW1lKTtcbiAgICAgICAgICAgIGJhc2VUaGVtZS5wYWxldHRlLnByaW1hcnkxQ29sb3IgPSBtdWlUaGVtZS5wYWxldHRlLmFjY2VudDFDb2xvcjtcbiAgICAgICAgICAgIHZhciBkYXJrVGhlbWUgPSAoMCwgX21hdGVyaWFsVWlTdHlsZXMuZ2V0TXVpVGhlbWUpKGJhc2VUaGVtZSk7XG5cbiAgICAgICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuICAgICAgICAgICAgICAgIF9tYXRlcmlhbFVpLk11aVRoZW1lUHJvdmlkZXIsXG4gICAgICAgICAgICAgICAgeyBtdWlUaGVtZTogZGFya1RoZW1lIH0sXG4gICAgICAgICAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudCgnZGl2JywgcHJvcHMpXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIERhcmtUaGVtZUNvbnRhaW5lcjtcbn0pKFJlYWN0LkNvbXBvbmVudCk7XG5cbkRhcmtUaGVtZUNvbnRhaW5lciA9ICgwLCBfbWF0ZXJpYWxVaVN0eWxlcy5tdWlUaGVtZWFibGUpKCkoRGFya1RoZW1lQ29udGFpbmVyKTtcblxudmFyIE11bHRpQXV0aFNlbGVjdG9yID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuICAgIGRpc3BsYXlOYW1lOiAnTXVsdGlBdXRoU2VsZWN0b3InLFxuXG4gICAgZ2V0VmFsdWU6IGZ1bmN0aW9uIGdldFZhbHVlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zdGF0ZS52YWx1ZTtcbiAgICB9LFxuXG4gICAgZ2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiBnZXRJbml0aWFsU3RhdGUoKSB7XG4gICAgICAgIHJldHVybiB7IHZhbHVlOiBPYmplY3Qua2V5cyh0aGlzLnByb3BzLmF1dGhTb3VyY2VzKS5zaGlmdCgpIH07XG4gICAgfSxcblxuICAgIG9uQ2hhbmdlOiBmdW5jdGlvbiBvbkNoYW5nZShvYmplY3QsIGtleSwgcGF5bG9hZCkge1xuICAgICAgICB0aGlzLnNldFN0YXRlKHsgdmFsdWU6IHBheWxvYWQgfSk7XG4gICAgfSxcblxuICAgIHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgICAgICB2YXIgbWVudUl0ZW1zID0gW107XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB0aGlzLnByb3BzLmF1dGhTb3VyY2VzKSB7XG4gICAgICAgICAgICBtZW51SXRlbXMucHVzaChSZWFjdC5jcmVhdGVFbGVtZW50KF9tYXRlcmlhbFVpLk1lbnVJdGVtLCB7IHZhbHVlOiBrZXksIHByaW1hcnlUZXh0OiB0aGlzLnByb3BzLmF1dGhTb3VyY2VzW2tleV0gfSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuICAgICAgICAgICAgX21hdGVyaWFsVWkuU2VsZWN0RmllbGQsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuc3RhdGUudmFsdWUsXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6IHRoaXMub25DaGFuZ2UsXG4gICAgICAgICAgICAgICAgZmxvYXRpbmdMYWJlbFRleHQ6ICdMb2dpbiBhcy4uLidcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtZW51SXRlbXNcbiAgICAgICAgKTtcbiAgICB9XG59KTtcblxudmFyIE11bHRpQXV0aE1vZGlmaWVyID0gKGZ1bmN0aW9uIChfUHlkaW9SZWFjdFVJJEFic3RyYWN0RGlhbG9nTW9kaWZpZXIpIHtcbiAgICBfaW5oZXJpdHMoTXVsdGlBdXRoTW9kaWZpZXIsIF9QeWRpb1JlYWN0VUkkQWJzdHJhY3REaWFsb2dNb2RpZmllcik7XG5cbiAgICBmdW5jdGlvbiBNdWx0aUF1dGhNb2RpZmllcigpIHtcbiAgICAgICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIE11bHRpQXV0aE1vZGlmaWVyKTtcblxuICAgICAgICBfZ2V0KE9iamVjdC5nZXRQcm90b3R5cGVPZihNdWx0aUF1dGhNb2RpZmllci5wcm90b3R5cGUpLCAnY29uc3RydWN0b3InLCB0aGlzKS5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIF9jcmVhdGVDbGFzcyhNdWx0aUF1dGhNb2RpZmllciwgW3tcbiAgICAgICAga2V5OiAnZW5yaWNoU3VibWl0UGFyYW1ldGVycycsXG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiBlbnJpY2hTdWJtaXRQYXJhbWV0ZXJzKHByb3BzLCBzdGF0ZSwgcmVmcywgcGFyYW1zKSB7XG5cbiAgICAgICAgICAgIHZhciBzZWxlY3RlZFNvdXJjZSA9IHJlZnMubXVsdGlfc2VsZWN0b3IuZ2V0VmFsdWUoKTtcbiAgICAgICAgICAgIHBhcmFtc1snYXV0aF9zb3VyY2UnXSA9IHNlbGVjdGVkU291cmNlO1xuICAgICAgICAgICAgaWYgKHByb3BzLm1hc3RlckF1dGhTb3VyY2UgJiYgc2VsZWN0ZWRTb3VyY2UgPT09IHByb3BzLm1hc3RlckF1dGhTb3VyY2UpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXNbJ3VzZXJpZCddID0gc2VsZWN0ZWRTb3VyY2UgKyBwcm9wcy51c2VySWRTZXBhcmF0b3IgKyBwYXJhbXNbJ3VzZXJpZCddO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSwge1xuICAgICAgICBrZXk6ICdyZW5kZXJBZGRpdGlvbmFsQ29tcG9uZW50cycsXG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiByZW5kZXJBZGRpdGlvbmFsQ29tcG9uZW50cyhwcm9wcywgc3RhdGUsIGFjY3VtdWxhdG9yKSB7XG5cbiAgICAgICAgICAgIGlmICghcHJvcHMuYXV0aFNvdXJjZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdDb3VsZCBub3QgZmluZCBhdXRoU291cmNlcycpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFjY3VtdWxhdG9yLnRvcC5wdXNoKFJlYWN0LmNyZWF0ZUVsZW1lbnQoTXVsdGlBdXRoU2VsZWN0b3IsIF9leHRlbmRzKHsgcmVmOiAnbXVsdGlfc2VsZWN0b3InIH0sIHByb3BzLCB7IHBhcmVudFN0YXRlOiBzdGF0ZSB9KSkpO1xuICAgICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIE11bHRpQXV0aE1vZGlmaWVyO1xufSkoUHlkaW9SZWFjdFVJLkFic3RyYWN0RGlhbG9nTW9kaWZpZXIpO1xuXG52YXIgQ2FsbGJhY2tzID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDYWxsYmFja3MoKSB7XG4gICAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBDYWxsYmFja3MpO1xuICAgIH1cblxuICAgIF9jcmVhdGVDbGFzcyhDYWxsYmFja3MsIG51bGwsIFt7XG4gICAgICAgIGtleTogJ3Nlc3Npb25Mb2dvdXQnLFxuICAgICAgICB2YWx1ZTogZnVuY3Rpb24gc2Vzc2lvbkxvZ291dCgpIHtcblxuICAgICAgICAgICAgaWYgKFB5ZGlvLmdldEluc3RhbmNlKCkuUGFyYW1ldGVycy5nZXQoXCJQUkVMT0dfVVNFUlwiKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgX3B5ZGlvSHR0cEFwaTJbJ2RlZmF1bHQnXS5nZXRSZXN0Q2xpZW50KCkuc2Vzc2lvbkxvZ291dCgpWydmaW5hbGx5J10oZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gd2luZG93LmxvY2F0aW9uLmhyZWYgPSBweWRpby5QYXJhbWV0ZXJzLmdldCgnRlJPTlRFTkRfVVJMJykgKyAnL2xvZ291dCc7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sIHtcbiAgICAgICAga2V5OiAnbG9naW5QYXNzd29yZCcsXG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiBsb2dpblBhc3N3b3JkKG1hbmFnZXIpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gW10gOiBhcmd1bWVudHNbMV07XG5cbiAgICAgICAgICAgIGlmIChQeWRpby5nZXRJbnN0YW5jZSgpLlBhcmFtZXRlcnMuZ2V0KFwiUFJFTE9HX1VTRVJcIikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBfcmVmID0gYXJnc1swXSB8fCB7fTtcblxuICAgICAgICAgICAgdmFyIF9yZWYkY3JlYXRlQXV0aFJlcXVlc3QgPSBfcmVmLmNyZWF0ZUF1dGhSZXF1ZXN0O1xuICAgICAgICAgICAgdmFyIGNyZWF0ZUF1dGhSZXF1ZXN0ID0gX3JlZiRjcmVhdGVBdXRoUmVxdWVzdCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYkY3JlYXRlQXV0aFJlcXVlc3Q7XG5cbiAgICAgICAgICAgIHZhciBwcm9wcyA9IF9vYmplY3RXaXRob3V0UHJvcGVydGllcyhfcmVmLCBbJ2NyZWF0ZUF1dGhSZXF1ZXN0J10pO1xuXG4gICAgICAgICAgICB2YXIgZm4gPSBmdW5jdGlvbiBmbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHlkaW8uVUkub3BlbkNvbXBvbmVudEluTW9kYWwoJ0F1dGhmcm9udENvcmVBY3Rpb25zJywgJ0xvZ2luUGFzc3dvcmREaWFsb2cnLCBfZXh0ZW5kcyh7fSwgcHJvcHMsIHsgYmx1cjogdHJ1ZSB9KSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAoY3JlYXRlQXV0aFJlcXVlc3QpIHtcbiAgICAgICAgICAgICAgICBfcHlkaW9IdHRwQXBpMlsnZGVmYXVsdCddLmdldFJlc3RDbGllbnQoKS5qd3RXaXRoQXV0aEluZm8oeyB0eXBlOiBcImNyZWF0ZV9hdXRoX3JlcXVlc3RcIiB9KS50aGVuKGZuKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1dKTtcblxuICAgIHJldHVybiBDYWxsYmFja3M7XG59KSgpO1xuXG52YXIgUmVzZXRQYXNzd29yZFJlcXVpcmUgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG4gICAgZGlzcGxheU5hbWU6ICdSZXNldFBhc3N3b3JkUmVxdWlyZScsXG5cbiAgICBtaXhpbnM6IFtQeWRpb1JlYWN0VUkuQWN0aW9uRGlhbG9nTWl4aW4sIFB5ZGlvUmVhY3RVSS5TdWJtaXRCdXR0b25Qcm92aWRlck1peGluLCBQeWRpb1JlYWN0VUkuQ2FuY2VsQnV0dG9uUHJvdmlkZXJNaXhpbl0sXG5cbiAgICBzdGF0aWNzOiB7XG4gICAgICAgIG9wZW46IGZ1bmN0aW9uIG9wZW4oKSB7XG4gICAgICAgICAgICBweWRpby5VSS5vcGVuQ29tcG9uZW50SW5Nb2RhbCgnQXV0aGZyb250Q29yZUFjdGlvbnMnLCAnUmVzZXRQYXNzd29yZFJlcXVpcmUnLCB7IGJsdXI6IHRydWUgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgZ2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkaWFsb2dUaXRsZTogcHlkaW8uTWVzc2FnZUhhc2hbJ2d1aS51c2VyLjEnXSxcbiAgICAgICAgICAgIGRpYWxvZ0lzTW9kYWw6IHRydWUsXG4gICAgICAgICAgICBkaWFsb2dTaXplOiAnc20nXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIHVzZUJsdXI6IGZ1bmN0aW9uIHVzZUJsdXIoKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG5cbiAgICBjYW5jZWw6IGZ1bmN0aW9uIGNhbmNlbCgpIHtcbiAgICAgICAgcHlkaW8uQ29udHJvbGxlci5maXJlQWN0aW9uKCdsb2dpbicpO1xuICAgIH0sXG5cbiAgICBzdWJtaXQ6IGZ1bmN0aW9uIHN1Ym1pdCgpIHtcbiAgICAgICAgdmFyIF90aGlzNCA9IHRoaXM7XG5cbiAgICAgICAgdmFyIHZhbHVlU3VibWl0dGVkID0gdGhpcy5zdGF0ZSAmJiB0aGlzLnN0YXRlLnZhbHVlU3VibWl0dGVkO1xuICAgICAgICBpZiAodmFsdWVTdWJtaXR0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuY2FuY2VsKCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHZhbHVlID0gdGhpcy5yZWZzLmlucHV0ICYmIHRoaXMucmVmcy5pbnB1dC5nZXRWYWx1ZSgpO1xuICAgICAgICBpZiAoIXZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYXBpID0gbmV3IF9weWRpb0h0dHBSZXN0QXBpLlRva2VuU2VydmljZUFwaShfcHlkaW9IdHRwQXBpMlsnZGVmYXVsdCddLmdldFJlc3RDbGllbnQoKSk7XG4gICAgICAgIGFwaS5yZXNldFBhc3N3b3JkVG9rZW4odmFsdWUpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgX3RoaXM0LnNldFN0YXRlKHsgdmFsdWVTdWJtaXR0ZWQ6IHRydWUgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICByZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICAgICAgdmFyIG1lc3MgPSB0aGlzLnByb3BzLnB5ZGlvLk1lc3NhZ2VIYXNoO1xuICAgICAgICB2YXIgdmFsdWVTdWJtaXR0ZWQgPSB0aGlzLnN0YXRlICYmIHRoaXMuc3RhdGUudmFsdWVTdWJtaXR0ZWQ7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuICAgICAgICAgICAgJ2RpdicsXG4gICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgIXZhbHVlU3VibWl0dGVkICYmIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG4gICAgICAgICAgICAgICAgJ2RpdicsXG4gICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICBSZWFjdC5jcmVhdGVFbGVtZW50KFxuICAgICAgICAgICAgICAgICAgICAnZGl2JyxcbiAgICAgICAgICAgICAgICAgICAgeyBjbGFzc05hbWU6ICdkaWFsb2dMZWdlbmQnIH0sXG4gICAgICAgICAgICAgICAgICAgIG1lc3NbJ2d1aS51c2VyLjMnXVxuICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudChfbWF0ZXJpYWxVaS5UZXh0RmllbGQsIHtcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnYmx1ckRpYWxvZ1RleHRGaWVsZCcsXG4gICAgICAgICAgICAgICAgICAgIHJlZjogJ2lucHV0JyxcbiAgICAgICAgICAgICAgICAgICAgZnVsbFdpZHRoOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBmbG9hdGluZ0xhYmVsVGV4dDogbWVzc1snZ3VpLnVzZXIuNCddXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICksXG4gICAgICAgICAgICB2YWx1ZVN1Ym1pdHRlZCAmJiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuICAgICAgICAgICAgICAgICdkaXYnLFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgbWVzc1snZ3VpLnVzZXIuNSddXG4gICAgICAgICAgICApXG4gICAgICAgICk7XG4gICAgfVxuXG59KTtcblxudmFyIFJlc2V0UGFzc3dvcmREaWFsb2cgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG4gICAgZGlzcGxheU5hbWU6ICdSZXNldFBhc3N3b3JkRGlhbG9nJyxcblxuICAgIG1peGluczogW1B5ZGlvUmVhY3RVSS5BY3Rpb25EaWFsb2dNaXhpbiwgUHlkaW9SZWFjdFVJLlN1Ym1pdEJ1dHRvblByb3ZpZGVyTWl4aW5dLFxuXG4gICAgc3RhdGljczoge1xuICAgICAgICBvcGVuOiBmdW5jdGlvbiBvcGVuKCkge1xuICAgICAgICAgICAgcHlkaW8uVUkub3BlbkNvbXBvbmVudEluTW9kYWwoJ0F1dGhmcm9udENvcmVBY3Rpb25zJywgJ1Jlc2V0UGFzc3dvcmREaWFsb2cnLCB7IGJsdXI6IHRydWUgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgZ2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkaWFsb2dUaXRsZTogcHlkaW8uTWVzc2FnZUhhc2hbJ2d1aS51c2VyLjEnXSxcbiAgICAgICAgICAgIGRpYWxvZ0lzTW9kYWw6IHRydWUsXG4gICAgICAgICAgICBkaWFsb2dTaXplOiAnc20nXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gZ2V0SW5pdGlhbFN0YXRlKCkge1xuICAgICAgICByZXR1cm4geyB2YWx1ZVN1Ym1pdHRlZDogZmFsc2UsIGZvcm1Mb2FkZWQ6IGZhbHNlLCBwYXNzVmFsdWU6IG51bGwsIHVzZXJJZDogbnVsbCB9O1xuICAgIH0sXG5cbiAgICB1c2VCbHVyOiBmdW5jdGlvbiB1c2VCbHVyKCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuXG4gICAgc3VibWl0OiBmdW5jdGlvbiBzdWJtaXQoKSB7XG4gICAgICAgIHZhciBfdGhpczUgPSB0aGlzO1xuXG4gICAgICAgIHZhciBweWRpbyA9IHRoaXMucHJvcHMucHlkaW87XG5cbiAgICAgICAgaWYgKHRoaXMuc3RhdGUudmFsdWVTdWJtaXR0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMucHJvcHMub25EaXNtaXNzKCk7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHB5ZGlvLlBhcmFtZXRlcnMuZ2V0KCdGUk9OVEVORF9VUkwnKSArICcvbG9naW4nO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG1lc3MgPSBweWRpby5NZXNzYWdlSGFzaDtcbiAgICAgICAgdmFyIGFwaSA9IG5ldyBfcHlkaW9IdHRwUmVzdEFwaS5Ub2tlblNlcnZpY2VBcGkoX3B5ZGlvSHR0cEFwaTJbJ2RlZmF1bHQnXS5nZXRSZXN0Q2xpZW50KCkpO1xuICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBfcHlkaW9IdHRwUmVzdEFwaS5SZXN0UmVzZXRQYXNzd29yZFJlcXVlc3QoKTtcbiAgICAgICAgcmVxdWVzdC5Vc2VyTG9naW4gPSB0aGlzLnN0YXRlLnVzZXJJZDtcbiAgICAgICAgcmVxdWVzdC5SZXNldFBhc3N3b3JkVG9rZW4gPSBweWRpby5QYXJhbWV0ZXJzLmdldCgnVVNFUl9BQ1RJT05fS0VZJyk7XG4gICAgICAgIHJlcXVlc3QuTmV3UGFzc3dvcmQgPSB0aGlzLnN0YXRlLnBhc3NWYWx1ZTtcbiAgICAgICAgYXBpLnJlc2V0UGFzc3dvcmQocmVxdWVzdCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBfdGhpczUuc2V0U3RhdGUoeyB2YWx1ZVN1Ym1pdHRlZDogdHJ1ZSB9KTtcbiAgICAgICAgfSlbJ2NhdGNoJ10oZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGFsZXJ0KG1lc3NbMjQwXSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgICAgIHZhciBfdGhpczYgPSB0aGlzO1xuXG4gICAgICAgIFByb21pc2UucmVzb2x2ZShyZXF1aXJlKCdweWRpbycpLnJlcXVpcmVMaWIoJ2Zvcm0nLCB0cnVlKSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBfdGhpczYuc2V0U3RhdGUoeyBmb3JtTG9hZGVkOiB0cnVlIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgb25QYXNzQ2hhbmdlOiBmdW5jdGlvbiBvblBhc3NDaGFuZ2UobmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoeyBwYXNzVmFsdWU6IG5ld1ZhbHVlIH0pO1xuICAgIH0sXG5cbiAgICBvblVzZXJJZENoYW5nZTogZnVuY3Rpb24gb25Vc2VySWRDaGFuZ2UoZXZlbnQsIG5ld1ZhbHVlKSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoeyB1c2VySWQ6IG5ld1ZhbHVlIH0pO1xuICAgIH0sXG5cbiAgICByZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICAgICAgdmFyIG1lc3MgPSB0aGlzLnByb3BzLnB5ZGlvLk1lc3NhZ2VIYXNoO1xuICAgICAgICB2YXIgX3N0YXRlID0gdGhpcy5zdGF0ZTtcbiAgICAgICAgdmFyIHZhbHVlU3VibWl0dGVkID0gX3N0YXRlLnZhbHVlU3VibWl0dGVkO1xuICAgICAgICB2YXIgZm9ybUxvYWRlZCA9IF9zdGF0ZS5mb3JtTG9hZGVkO1xuICAgICAgICB2YXIgcGFzc1ZhbHVlID0gX3N0YXRlLnBhc3NWYWx1ZTtcbiAgICAgICAgdmFyIHVzZXJJZCA9IF9zdGF0ZS51c2VySWQ7XG5cbiAgICAgICAgaWYgKCF2YWx1ZVN1Ym1pdHRlZCAmJiBmb3JtTG9hZGVkKSB7XG5cbiAgICAgICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFxuICAgICAgICAgICAgICAgICdkaXYnLFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudChcbiAgICAgICAgICAgICAgICAgICAgJ2RpdicsXG4gICAgICAgICAgICAgICAgICAgIHsgY2xhc3NOYW1lOiAnZGlhbG9nTGVnZW5kJyB9LFxuICAgICAgICAgICAgICAgICAgICBtZXNzWydndWkudXNlci44J11cbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX21hdGVyaWFsVWkuVGV4dEZpZWxkLCB7XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ2JsdXJEaWFsb2dUZXh0RmllbGQnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdXNlcklkLFxuICAgICAgICAgICAgICAgICAgICBmbG9hdGluZ0xhYmVsVGV4dDogbWVzc1snZ3VpLnVzZXIuNCddLFxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZTogdGhpcy5vblVzZXJJZENoYW5nZS5iaW5kKHRoaXMpXG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgUmVhY3QuY3JlYXRlRWxlbWVudChQeWRpb0Zvcm0uVmFsaWRQYXNzd29yZCwge1xuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdibHVyRGlhbG9nVGV4dEZpZWxkJyxcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IHRoaXMub25QYXNzQ2hhbmdlLmJpbmQodGhpcyksXG4gICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHsgbmFtZTogJ3Bhc3N3b3JkJywgbGFiZWw6IG1lc3NbMTk4XSB9LFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcGFzc1ZhbHVlXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAodmFsdWVTdWJtaXR0ZWQpIHtcblxuICAgICAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXG4gICAgICAgICAgICAgICAgJ2RpdicsXG4gICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICBtZXNzWydndWkudXNlci42J11cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChQeWRpb1JlYWN0VUkuTG9hZGVyLCBudWxsKTtcbiAgICAgICAgfVxuICAgIH1cblxufSk7XG5cbmV4cG9ydHMuQ2FsbGJhY2tzID0gQ2FsbGJhY2tzO1xuZXhwb3J0cy5Mb2dpblBhc3N3b3JkRGlhbG9nID0gTG9naW5QYXNzd29yZERpYWxvZztcbmV4cG9ydHMuUmVzZXRQYXNzd29yZFJlcXVpcmUgPSBSZXNldFBhc3N3b3JkUmVxdWlyZTtcbmV4cG9ydHMuUmVzZXRQYXNzd29yZERpYWxvZyA9IFJlc2V0UGFzc3dvcmREaWFsb2c7XG5leHBvcnRzLk11bHRpQXV0aE1vZGlmaWVyID0gTXVsdGlBdXRoTW9kaWZpZXI7XG5leHBvcnRzLkxhbmd1YWdlUGlja2VyID0gTGFuZ3VhZ2VQaWNrZXI7XG4iXX0=
