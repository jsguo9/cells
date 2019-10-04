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

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x3, _x4, _x5) { var _again = true; _function: while (_again) { var object = _x3, property = _x4, receiver = _x5; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x3 = parent; _x4 = property; _x5 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _materialUi = require('material-ui');

var _editorDataSourceEditor = require('../editor/DataSourceEditor');

var _editorDataSourceEditor2 = _interopRequireDefault(_editorDataSourceEditor);

var _editorVersionPolicyEditor = require('../editor/VersionPolicyEditor');

var _editorVersionPolicyEditor2 = _interopRequireDefault(_editorVersionPolicyEditor);

var _pydioModelDataModel = require('pydio/model/data-model');

var _pydioModelDataModel2 = _interopRequireDefault(_pydioModelDataModel);

var _pydioModelNode = require('pydio/model/node');

var _pydioModelNode2 = _interopRequireDefault(_pydioModelNode);

var _pydioUtilLang = require('pydio/util/lang');

var _pydioUtilLang2 = _interopRequireDefault(_pydioUtilLang);

var _pydio = require('pydio');

var _pydio2 = _interopRequireDefault(_pydio);

var _modelDataSource = require('../model/DataSource');

var _modelDataSource2 = _interopRequireDefault(_modelDataSource);

var _pydioHttpRestApi = require('pydio/http/rest-api');

var _uuid4 = require('uuid4');

var _uuid42 = _interopRequireDefault(_uuid4);

var _editorVersionPolicyPeriods = require('../editor/VersionPolicyPeriods');

var _editorVersionPolicyPeriods2 = _interopRequireDefault(_editorVersionPolicyPeriods);

var _EncryptionKeys = require('./EncryptionKeys');

var _EncryptionKeys2 = _interopRequireDefault(_EncryptionKeys);

var _Pydio$requireLib = _pydio2['default'].requireLib('components');

var MaterialTable = _Pydio$requireLib.MaterialTable;

var DataSourcesBoard = (function (_React$Component) {
    _inherits(DataSourcesBoard, _React$Component);

    function DataSourcesBoard(props) {
        _classCallCheck(this, DataSourcesBoard);

        _get(Object.getPrototypeOf(DataSourcesBoard.prototype), 'constructor', this).call(this, props);
        this.state = {
            dataSources: [],
            versioningPolicies: [],
            dsLoaded: false,
            versionsLoaded: false,
            showExportKey: false,
            exportedKey: null,
            showImportKey: false,
            importResult: null,
            keyOperationError: null,
            startedServices: [],
            peerAddresses: [],
            m: function m(id) {
                return props.pydio.MessageHash["ajxp_admin.ds." + id] || id;
            }
        };
    }

    _createClass(DataSourcesBoard, [{
        key: 'componentDidMount',
        value: function componentDidMount() {
            var _this = this;

            var api = new _pydioHttpRestApi.ConfigServiceApi(PydioApi.getRestClient());
            this.statusPoller = setInterval(function () {
                _modelDataSource2['default'].loadStatuses().then(function (data) {
                    _this.setState({ startedServices: data.Services });
                });
                api.listPeersAddresses().then(function (res) {
                    _this.setState({ peerAddresses: res.PeerAddresses || [] });
                });
            }, 2500);
            this.load();
        }
    }, {
        key: 'componentWillUnmount',
        value: function componentWillUnmount() {
            clearInterval(this.statusPoller);
        }
    }, {
        key: 'load',
        value: function load() {
            var _this2 = this;

            var newDsName = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];

            this.setState({
                dsLoaded: false,
                versionsLoaded: false,
                newDsName: newDsName
            });
            _modelDataSource2['default'].loadDatasources().then(function (data) {
                _this2.setState({ dataSources: data.DataSources || [], dsLoaded: true });
            });
            _modelDataSource2['default'].loadVersioningPolicies().then(function (data) {
                _this2.setState({ versioningPolicies: data.Policies || [], versionsLoaded: true });
            });
            _modelDataSource2['default'].loadStatuses().then(function (data) {
                _this2.setState({ startedServices: data.Services });
            });
            if (this.refs && this.refs.encKeys) {
                this.refs.encKeys.load();
            }
        }
    }, {
        key: 'closeEditor',
        value: function closeEditor() {
            this.props.closeRightPane();
        }
    }, {
        key: 'openDataSource',
        value: function openDataSource(dataSources) {
            if (!dataSources.length) {
                return;
            }
            var dataSource = dataSources[0];
            this.props.openRightPane({
                COMPONENT: _editorDataSourceEditor2['default'],
                PROPS: {
                    ref: "editor",
                    pydio: this.props.pydio,
                    dataSource: dataSource,
                    storageTypes: this.props.storageTypes,
                    closeEditor: this.closeEditor.bind(this),
                    reloadList: this.load.bind(this)
                }
            });
        }
    }, {
        key: 'computeStatus',
        value: function computeStatus(dataSource) {
            var _this3 = this;

            var _state = this.state;
            var startedServices = _state.startedServices;
            var peerAddresses = _state.peerAddresses;
            var m = _state.m;
            var newDsName = _state.newDsName;

            if (!startedServices.length) {
                return m('status.na');
            }
            var index = undefined,
                sync = undefined,
                object = undefined;
            startedServices.map(function (service) {
                if (service.Name === 'pydio.grpc.data.sync.' + dataSource.Name && service.Status === 'STARTED') {
                    sync = true;
                } else if (service.Name === 'pydio.grpc.data.index.' + dataSource.Name && service.Status === 'STARTED') {
                    index = true;
                } else if (service.Name === 'pydio.grpc.data.objects.' + dataSource.ObjectsServiceName && service.Status === 'STARTED') {
                    object = true;
                }
            });
            if (index && sync && object) {
                if (newDsName && dataSource.Name === newDsName) {
                    setTimeout(function () {
                        _this3.setState({ newDsName: null });
                    }, 100);
                }
                return _react2['default'].createElement(
                    'span',
                    { style: { color: '#1b5e20' } },
                    _react2['default'].createElement('span', { className: "mdi mdi-check" }),
                    ' ',
                    m('status.ok')
                );
            } else if (newDsName && dataSource.Name === newDsName) {
                return _react2['default'].createElement(
                    'span',
                    { style: { color: '#ef6c00' } },
                    _react2['default'].createElement('span', { className: "mdi mdi-timer-sand" }),
                    ' ',
                    m('status.starting')
                );
            } else if (!index && !sync && !object) {
                var koMessage = m('status.ko');
                if (peerAddresses && peerAddresses.indexOf(dataSource.PeerAddress) === -1) {
                    koMessage = m('status.ko-peers').replace('%s', dataSource.PeerAddress);
                }
                return _react2['default'].createElement(
                    'span',
                    { style: { color: '#e53935' } },
                    _react2['default'].createElement('span', { className: "mdi mdi-alert" }),
                    ' ',
                    koMessage
                );
            } else {
                var services = [];
                if (!index) {
                    services.push(m('status.index'));
                }
                if (!sync) {
                    services.push(m('status.sync'));
                }
                if (!object) {
                    services.push(m('status.object'));
                }
                return _react2['default'].createElement(
                    'span',
                    { style: { color: '#e53935' } },
                    _react2['default'].createElement('span', { className: "mdi mdi-alert" }),
                    ' ',
                    services.join(' - ')
                );
            }
        }
    }, {
        key: 'openVersionPolicy',
        value: function openVersionPolicy() {
            var versionPolicies = arguments.length <= 0 || arguments[0] === undefined ? undefined : arguments[0];

            if (versionPolicies !== undefined && !versionPolicies.length) {
                return;
            }
            var versionPolicy = undefined;
            var create = false;
            if (versionPolicies === undefined) {
                create = true;
                versionPolicy = new _pydioHttpRestApi.TreeVersioningPolicy();
                versionPolicy.Uuid = (0, _uuid42['default'])();
                versionPolicy.VersionsDataSourceName = "default";
                versionPolicy.VersionsDataSourceBucket = "versions";
                var period = new _pydioHttpRestApi.TreeVersioningKeepPeriod();
                period.IntervalStart = "0";
                period.MaxNumber = -1;
                versionPolicy.KeepPeriods = [period];
            } else {
                versionPolicy = versionPolicies[0];
            }
            this.props.openRightPane({
                COMPONENT: _editorVersionPolicyEditor2['default'],
                PROPS: {
                    ref: "editor",
                    versionPolicy: versionPolicy,
                    create: create,
                    pydio: this.props.pydio,
                    readonly: this.props.versioningReadonly,
                    closeEditor: this.closeEditor.bind(this),
                    reloadList: this.load.bind(this)
                }
            });
        }
    }, {
        key: 'createDataSource',
        value: function createDataSource() {
            var _props = this.props;
            var pydio = _props.pydio;
            var storageTypes = _props.storageTypes;

            this.props.openRightPane({
                COMPONENT: _editorDataSourceEditor2['default'],
                PROPS: {
                    ref: "editor",
                    create: true,
                    pydio: pydio,
                    storageTypes: storageTypes,
                    closeEditor: this.closeEditor.bind(this),
                    reloadList: this.load.bind(this)
                }
            });
        }
    }, {
        key: 'render',
        value: function render() {
            var _this4 = this;

            var _state2 = this.state;
            var dataSources = _state2.dataSources;
            var versioningPolicies = _state2.versioningPolicies;
            var m = _state2.m;

            dataSources.sort(_pydioUtilLang2['default'].arraySorter('Name'));
            versioningPolicies.sort(_pydioUtilLang2['default'].arraySorter('Name'));

            var _props2 = this.props;
            var currentNode = _props2.currentNode;
            var pydio = _props2.pydio;
            var versioningReadonly = _props2.versioningReadonly;

            var dsColumns = [{ name: 'Name', label: m('name'), style: { fontSize: 15, width: '20%' }, headerStyle: { width: '20%' } }, { name: 'Status', label: m('status'), renderCell: function renderCell(row) {
                    return row.Disabled ? _react2['default'].createElement(
                        'span',
                        { style: { color: '#757575' } },
                        _react2['default'].createElement('span', { className: "mdi mdi-checkbox-blank-circle-outline" }),
                        ' ',
                        m('status.disabled')
                    ) : _this4.computeStatus(row);
                } }, { name: 'StorageType', label: m('storage'), hideSmall: true, style: { width: '20%' }, headerStyle: { width: '20%' }, renderCell: function renderCell(row) {
                    var s = 'storage.fs';
                    switch (row.StorageType) {
                        case "S3":
                            s = 'storage.s3';
                            break;
                        case "AZURE":
                            s = 'storage.azure';
                            break;
                        case "GCS":
                            s = 'storage.gcs';
                            break;
                        default:
                            break;
                    }
                    return m(s);
                } }, { name: 'VersioningPolicyName', label: m('versioning'), style: { width: '15%' }, headerStyle: { width: '15%' }, hideSmall: true, renderCell: function renderCell(row) {
                    var pol = versioningPolicies.find(function (obj) {
                        return obj.Uuid === row['VersioningPolicyName'];
                    });
                    if (pol) {
                        return pol.Name;
                    } else {
                        return row['VersioningPolicyName'] || '-';
                    }
                } }, { name: 'EncryptionMode', label: m('encryption'), hideSmall: true, style: { width: '10%', textAlign: 'center' }, headerStyle: { width: '10%' }, renderCell: function renderCell(row) {
                    return row['EncryptionMode'] === 'MASTER' ? pydio.MessageHash['440'] : pydio.MessageHash['441'];
                } }];
            var title = currentNode.getLabel();
            var icon = currentNode.getMetadata().get('icon_class');
            var buttons = [_react2['default'].createElement(_materialUi.FlatButton, { primary: true, label: pydio.MessageHash['ajxp_admin.ws.4'], onTouchTap: this.createDataSource.bind(this) })];
            if (!versioningReadonly) {
                buttons.push(_react2['default'].createElement(_materialUi.FlatButton, { primary: true, label: pydio.MessageHash['ajxp_admin.ws.4b'], onTouchTap: function () {
                        _this4.openVersionPolicy();
                    } }));
            }
            var policiesColumns = [{ name: 'Name', label: m('versioning.name'), style: { width: 180, fontSize: 15 }, headerStyle: { width: 180 } }, { name: 'Description', label: m('versioning.description') }, { name: 'KeepPeriods', hideSmall: true, label: m('versioning.periods'), renderCell: function renderCell(row) {
                    return _react2['default'].createElement(_editorVersionPolicyPeriods2['default'], { rendering: 'short', periods: row.KeepPeriods, pydio: pydio });
                } }];

            return _react2['default'].createElement(
                'div',
                { className: 'main-layout-nav-to-stack workspaces-board' },
                _react2['default'].createElement(
                    'div',
                    { className: 'vertical-layout', style: { width: '100%' } },
                    _react2['default'].createElement(AdminComponents.Header, {
                        title: title,
                        icon: icon,
                        actions: buttons,
                        reloadAction: this.load.bind(this),
                        loading: !(this.state.dsLoaded && this.state.versionsLoaded)
                    }),
                    _react2['default'].createElement(
                        'div',
                        { className: 'layout-fill' },
                        _react2['default'].createElement(AdminComponents.SubHeader, { title: m('board.ds.title'), legend: m('board.ds.legend') }),
                        _react2['default'].createElement(
                            _materialUi.Paper,
                            { zDepth: 1, style: { margin: 16 } },
                            _react2['default'].createElement(MaterialTable, {
                                data: dataSources,
                                columns: dsColumns,
                                onSelectRows: this.openDataSource.bind(this),
                                deselectOnClickAway: true,
                                showCheckboxes: false,
                                emptyStateString: "No datasources created yet"
                            })
                        ),
                        _react2['default'].createElement(AdminComponents.SubHeader, { title: m('board.versioning.title'), legend: m('board.versioning.legend') }),
                        _react2['default'].createElement(
                            _materialUi.Paper,
                            { zDepth: 1, style: { margin: 16 } },
                            _react2['default'].createElement(MaterialTable, {
                                data: versioningPolicies,
                                columns: policiesColumns,
                                onSelectRows: this.openVersionPolicy.bind(this),
                                deselectOnClickAway: true,
                                showCheckboxes: false
                            })
                        ),
                        _react2['default'].createElement(AdminComponents.SubHeader, { title: m('board.enc.title'), legend: m('board.enc.legend') }),
                        _react2['default'].createElement(_EncryptionKeys2['default'], { pydio: pydio, ref: "encKeys" })
                    )
                )
            );
        }
    }]);

    return DataSourcesBoard;
})(_react2['default'].Component);

DataSourcesBoard.propTypes = {
    dataModel: _react2['default'].PropTypes.instanceOf(_pydioModelDataModel2['default']).isRequired,
    rootNode: _react2['default'].PropTypes.instanceOf(_pydioModelNode2['default']).isRequired,
    currentNode: _react2['default'].PropTypes.instanceOf(_pydioModelNode2['default']).isRequired,
    openEditor: _react2['default'].PropTypes.func.isRequired,
    openRightPane: _react2['default'].PropTypes.func.isRequired,
    closeRightPane: _react2['default'].PropTypes.func.isRequired,
    filter: _react2['default'].PropTypes.string,
    versioningReadonly: _react2['default'].PropTypes.bool
};

exports['default'] = DataSourcesBoard;
module.exports = exports['default'];
