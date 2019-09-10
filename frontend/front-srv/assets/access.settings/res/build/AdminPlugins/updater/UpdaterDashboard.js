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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _materialUi = require('material-ui');

var _materialUiStyles = require('material-ui/styles');

var _pydioHttpApi = require('pydio/http/api');

var _pydioHttpApi2 = _interopRequireDefault(_pydioHttpApi);

var _pydioHttpRestApi = require('pydio/http/rest-api');

var _pydio = require('pydio');

var _pydio2 = _interopRequireDefault(_pydio);

var _UpgraderWizard = require('./UpgraderWizard');

var _UpgraderWizard2 = _interopRequireDefault(_UpgraderWizard);

var _coreServiceExposedConfigs = require('../core/ServiceExposedConfigs');

var _coreServiceExposedConfigs2 = _interopRequireDefault(_coreServiceExposedConfigs);

var _Pydio$requireLib = _pydio2['default'].requireLib('boot');

var moment = _Pydio$requireLib.moment;
var SingleJobProgress = _Pydio$requireLib.SingleJobProgress;

var UpdaterDashboard = _react2['default'].createClass({
    displayName: 'UpdaterDashboard',

    mixins: [AdminComponents.MessagesConsumerMixin],

    getInitialState: function getInitialState() {
        var pydio = this.props.pydio;

        return {
            check: -1,
            backend: pydio.Parameters.get("backend")
        };
    },

    componentDidMount: function componentDidMount() {
        this.checkForUpgrade();
    },

    checkForUpgrade: function checkForUpgrade() {
        var _this = this;

        var pydio = this.props.pydio;

        this.setState({ loading: true });

        var url = pydio.Parameters.get('ENDPOINT_REST_API') + '/frontend/bootconf';
        window.fetch(url, {
            method: 'GET',
            credentials: 'same-origin'
        }).then(function (response) {
            response.json().then(function (data) {
                if (data.backend) {
                    _this.setState({ backend: data.backend });
                }
            })['catch'](function () {});
        })['catch'](function () {});

        var api = new _pydioHttpRestApi.UpdateServiceApi(_pydioHttpApi2['default'].getRestClient());
        _pydio2['default'].startLoading();
        api.updateRequired(new _pydioHttpRestApi.UpdateUpdateRequest()).then(function (res) {
            _pydio2['default'].endLoading();
            var hasBinary = 0;
            if (res.AvailableBinaries) {
                hasBinary = res.AvailableBinaries.length;
                _this.setState({ packages: res.AvailableBinaries });
            } else {
                _this.setState({ no_upgrade: true });
            }
            var node = pydio.getContextNode();
            node.getMetadata().set('flag', hasBinary);
            AdminComponents.MenuItemListener.getInstance().notify("item_changed");
            _this.setState({ loading: false });
        })['catch'](function () {
            _pydio2['default'].endLoading();
            _this.setState({ loading: false });
        });
    },

    upgradeFinished: function upgradeFinished() {
        var pydio = this.props.pydio;

        this.setState({ updateApplied: this.state.selectedPackage.Version });
        var node = pydio.getContextNode();
        node.getMetadata().set('flag', 0);
        AdminComponents.MenuItemListener.getInstance().notify("item_changed");
    },

    performUpgrade: function performUpgrade() {
        var _this2 = this;

        var pydio = this.props.pydio;
        var _state = this.state;
        var check = _state.check;
        var packages = _state.packages;

        if (check < 0 || !packages[check]) {
            alert(this.context.getMessage('alert.noselect', 'updater'));
            return;
        }

        if (confirm(this.context.getMessage('confirm.update', 'updater'))) {

            var toApply = packages[check];
            var version = toApply.Version;
            var api = new _pydioHttpRestApi.UpdateServiceApi(_pydioHttpApi2['default'].getRestClient());
            var req = new _pydioHttpRestApi.UpdateApplyUpdateRequest();
            req.TargetVersion = version;
            api.applyUpdate(version, req).then(function (res) {
                if (res.Success) {
                    _this2.setState({ watchJob: res.Message });
                } else {
                    pydio.UI.displayMessage('ERROR', res.Message);
                }
            })['catch'](function () {});
        }
    },

    onCheckStateChange: function onCheckStateChange(index, value, pack) {
        if (value) {
            this.setState({ check: index, selectedPackage: pack });
        } else {
            this.setState({ check: -1, selectedPackage: null });
        }
    },

    render: function render() {
        var _this3 = this;

        var list = null;
        var _state2 = this.state;
        var packages = _state2.packages;
        var check = _state2.check;
        var loading = _state2.loading;
        var dirty = _state2.dirty;
        var updateApplied = _state2.updateApplied;
        var selectedPackage = _state2.selectedPackage;
        var watchJob = _state2.watchJob;
        var backend = _state2.backend;

        var subHeaderStyle = {
            backgroundColor: '#f5f5f5',
            color: '#9e9e9e',
            fontSize: 12,
            fontWeight: 500,
            borderBottom: '1px solid #e0e0e0',
            height: 48,
            lineHeight: '48px',
            padding: '0 16px'
        };
        var accent2Color = this.props.muiTheme.palette.accent2Color;

        var buttons = [];
        if (packages) {
            buttons.push(_react2['default'].createElement(_materialUi.RaisedButton, { disabled: check < 0 || updateApplied, secondary: true, label: this.context.getMessage('start.update', 'updater'), onTouchTap: this.performUpgrade }));
            var items = [];

            var _loop = function (index) {
                var p = packages[index];
                items.push(_react2['default'].createElement(_materialUi.ListItem, {
                    leftCheckbox: _react2['default'].createElement(_materialUi.Checkbox, { key: p, onCheck: function (e, v) {
                            return _this3.onCheckStateChange(index, v, p);
                        }, checked: check >= index, disabled: updateApplied || check > index }),
                    primaryText: p.PackageName + ' ' + p.Version,
                    secondaryText: p.Label + ' - ' + moment(new Date(p.ReleaseDate * 1000)).fromNow()
                }));
                items.push(_react2['default'].createElement(_materialUi.Divider, null));
            };

            for (var index = packages.length - 1; index >= 0; index--) {
                _loop(index);
            }
            items.pop();
            list = _react2['default'].createElement(
                'div',
                null,
                _react2['default'].createElement(
                    'div',
                    { style: subHeaderStyle },
                    this.context.getMessage('packages.available', 'updater')
                ),
                _react2['default'].createElement(
                    _materialUi.List,
                    null,
                    items
                )
            );
        } else if (loading) {
            list = _react2['default'].createElement(
                'div',
                null,
                _react2['default'].createElement(
                    'div',
                    { style: subHeaderStyle },
                    this.context.getMessage('packages.available', 'updater')
                ),
                _react2['default'].createElement(
                    'div',
                    { style: { padding: 16 } },
                    this.context.getMessage('checking', 'updater')
                )
            );
        } else {
            list = _react2['default'].createElement(
                'div',
                { style: { minHeight: 36 } },
                _react2['default'].createElement(
                    'div',
                    { style: subHeaderStyle },
                    this.context.getMessage('check.button', 'updater')
                ),
                _react2['default'].createElement(
                    'div',
                    { style: { padding: '16px 16px 32px' } },
                    _react2['default'].createElement(
                        'span',
                        { style: { float: 'right' } },
                        _react2['default'].createElement(_materialUi.RaisedButton, { secondary: true, label: this.context.getMessage('check.button', 'updater'), onTouchTap: this.checkForUpgrade })
                    ),
                    this.state && this.state.no_upgrade ? this.context.getMessage('noupdates', 'updater') : this.context.getMessage('check.legend', 'updater')
                )
            );
        }

        if (dirty) {
            buttons.push(_react2['default'].createElement(_materialUi.RaisedButton, { style: { marginLeft: 10 }, secondary: true, label: this.context.getMessage('configs.save', 'updater'), onTouchTap: function () {
                    _this3.refs.serviceConfigs.save().then(function (res) {
                        _this3.setState({ dirty: false });
                    });
                } }));
        }

        var versionLabel = backend.PackageLabel + ' ' + backend.Version;
        var upgradeWizard = undefined;
        if (backend.PackageType === "PydioHome" && backend.Version) {
            upgradeWizard = _react2['default'].createElement(_UpgraderWizard2['default'], { open: this.state.upgradeDialog, onDismiss: function () {
                    return _this3.setState({ upgradeDialog: false });
                }, currentVersion: backend.Version, pydio: this.props.pydio });
            versionLabel = _react2['default'].createElement(
                'span',
                null,
                versionLabel,
                ' ',
                _react2['default'].createElement(
                    'a',
                    { style: { color: accent2Color, cursor: 'pointer' }, onClick: function () {
                            return _this3.setState({ upgradeDialog: true });
                        } },
                    '> ',
                    this.context.getMessage('upgrade.ed.title', 'updater'),
                    '...'
                )
            );
        }
        return _react2['default'].createElement(
            'div',
            { className: "main-layout-nav-to-stack vertical-layout people-dashboard" },
            _react2['default'].createElement(AdminComponents.Header, {
                title: this.context.getMessage('title', 'updater'),
                icon: 'mdi mdi-update',
                actions: buttons,
                reloadAction: function () {
                    _this3.checkForUpgrade();
                },
                loading: loading
            }),
            upgradeWizard,
            _react2['default'].createElement(
                'div',
                { style: { flex: 1, overflow: 'auto' } },
                _react2['default'].createElement(
                    _materialUi.Paper,
                    { style: { margin: 20 }, zDepth: 1 },
                    _react2['default'].createElement(
                        'div',
                        { style: subHeaderStyle },
                        this.context.getMessage('current.version', 'updater')
                    ),
                    _react2['default'].createElement(
                        _materialUi.List,
                        { style: { padding: '0 16px' } },
                        _react2['default'].createElement(_materialUi.ListItem, { primaryText: versionLabel, disabled: true, secondaryTextLines: 2, secondaryText: _react2['default'].createElement(
                                'span',
                                null,
                                this.context.getMessage('package.released', 'updater') + " : " + backend.BuildStamp,
                                _react2['default'].createElement('br', null),
                                this.context.getMessage('package.revision', 'updater') + " : " + backend.BuildRevision
                            ) })
                    )
                ),
                watchJob && _react2['default'].createElement(
                    _materialUi.Paper,
                    { style: { margin: '0 20px', position: 'relative' }, zDepth: 1 },
                    _react2['default'].createElement(
                        'div',
                        { style: subHeaderStyle },
                        selectedPackage ? selectedPackage.PackageName + ' ' + selectedPackage.Version : ''
                    ),
                    _react2['default'].createElement(
                        'div',
                        { style: { padding: 16 } },
                        _react2['default'].createElement(SingleJobProgress, {
                            jobID: watchJob,
                            progressStyle: { paddingTop: 16 },
                            lineStyle: { userSelect: 'text' },
                            onEnd: function () {
                                _this3.upgradeFinished();
                            }
                        })
                    )
                ),
                !watchJob && list && _react2['default'].createElement(
                    _materialUi.Paper,
                    { style: { margin: '0 20px', position: 'relative' }, zDepth: 1 },
                    list
                ),
                !watchJob && _react2['default'].createElement(_coreServiceExposedConfigs2['default'], {
                    className: "row-flex",
                    serviceName: "pydio.grpc.update",
                    ref: "serviceConfigs",
                    onDirtyChange: function (d) {
                        return _this3.setState({ dirty: d });
                    }
                })
            )
        );
    }

});

exports['default'] = UpdaterDashboard = (0, _materialUiStyles.muiThemeable)()(UpdaterDashboard);

exports['default'] = UpdaterDashboard;
module.exports = exports['default'];
