"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoinbaseWallet = void 0;
const types_1 = require("@web3-react/types");
function parseChainId(chainId) {
    return typeof chainId === 'number' ? chainId : Number.parseInt(chainId, chainId.startsWith('0x') ? 16 : 10);
}
class CoinbaseWallet extends types_1.Connector {
    constructor({ actions, options, onError }) {
        super(actions, onError);
        this.options = options;
    }
    // the `connected` property, is bugged, but this works as a hack to check connection status
    get connected() {
        var _a;
        return !!((_a = this.provider) === null || _a === void 0 ? void 0 : _a.connected);
    }
    isomorphicInitialize() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.eagerConnection)
                return;
            yield (this.eagerConnection = Promise.resolve().then(() => __importStar(require('@coinbase/wallet-sdk'))).then((m) => {
                const options = __rest(this.options, []);
                this.coinbaseWallet = new m.default(options);
                this.provider = this.coinbaseWallet.makeWeb3Provider();
                this.provider.on('connect', ({ chainId }) => {
                    this.actions.update({ chainId: parseChainId(chainId) });
                });
                this.provider.on('disconnect', (error) => {
                    var _a;
                    this.actions.resetState();
                    (_a = this.onError) === null || _a === void 0 ? void 0 : _a.call(this, error);
                });
                this.provider.on('chainChanged', (chainId) => {
                    this.actions.update({ chainId: parseChainId(chainId) });
                });
                this.provider.on('accountsChanged', (accounts) => {
                    if (accounts.length === 0) {
                        // handle this edge case by disconnecting
                        this.actions.resetState();
                    }
                    else {
                        this.actions.update({ accounts });
                    }
                });
            }));
        });
    }
    /** {@inheritdoc Connector.connectEagerly} */
    connectEagerly() {
        return __awaiter(this, void 0, void 0, function* () {
            const cancelActivation = this.actions.startActivation();
            try {
                yield this.isomorphicInitialize();
                if (!this.provider || !this.connected)
                    throw new Error('No existing connection');
                // Wallets may resolve eth_chainId and hang on eth_accounts pending user interaction, which may include changing
                // chains; they should be requested serially, with accounts first, so that the chainId can settle.
                const accounts = yield this.provider.request({ method: 'eth_accounts' });
                if (!accounts.length)
                    throw new Error('No accounts returned');
                const chainId = yield this.provider.request({ method: 'eth_chainId' });
                this.actions.update({ chainId: parseChainId(chainId), accounts });
            }
            catch (error) {
                cancelActivation();
                throw error;
            }
        });
    }
    /**
     * Initiates a connection.
     *
     * @param desiredChainIdOrChainParameters - If defined, indicates the desired chain to connect to. If the user is
     * already connected to this chain, no additional steps will be taken. Otherwise, the user will be prompted to switch
     * to the chain, if one of two conditions is met: either they already have it added, or the argument is of type
     * AddEthereumChainParameter, in which case the user will be prompted to add the chain with the specified parameters
     * first, before being prompted to switch.
     */
    activate(desiredChainIdOrChainParameters) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const desiredChainId = typeof desiredChainIdOrChainParameters === 'number'
                ? desiredChainIdOrChainParameters
                : desiredChainIdOrChainParameters === null || desiredChainIdOrChainParameters === void 0 ? void 0 : desiredChainIdOrChainParameters.chainId;
            if (this.provider && this.connected) {
                const chainId = yield this.provider.request({ method: 'eth_chainId' });
                if (!desiredChainId || desiredChainId === parseChainId(chainId))
                    return;
                const desiredChainIdHex = `0x${desiredChainId.toString(16)}`;
                return this.provider
                    .request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: desiredChainIdHex }],
                })
                    .catch((error) => __awaiter(this, void 0, void 0, function* () {
                    if (error.code === 4902 && typeof desiredChainIdOrChainParameters !== 'number') {
                        if (!this.provider)
                            throw new Error('No provider');
                        // if we're here, we can try to add a new network
                        return this.provider.request({
                            method: 'wallet_addEthereumChain',
                            params: [Object.assign(Object.assign({}, desiredChainIdOrChainParameters), { chainId: desiredChainIdHex })],
                        });
                    }
                    throw error;
                }));
            }
            const cancelActivation = this.actions.startActivation();
            try {
                yield this.isomorphicInitialize();
                if (!this.provider)
                    throw new Error('No provider');
                // Wallets may resolve eth_chainId and hang on eth_accounts pending user interaction, which may include changing
                // chains; they should be requested serially, with accounts first, so that the chainId can settle.
                const accounts = yield this.provider.request({ method: 'eth_requestAccounts' });
                const chainId = yield this.provider.request({ method: 'eth_chainId' });
                const receivedChainId = parseChainId(chainId);
                if (!desiredChainId || desiredChainId === receivedChainId)
                    return this.actions.update({ chainId: receivedChainId, accounts });
                // if we're here, we can try to switch networks
                const desiredChainIdHex = `0x${desiredChainId.toString(16)}`;
                return (_a = this.provider) === null || _a === void 0 ? void 0 : _a.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: desiredChainIdHex }],
                }).catch((error) => __awaiter(this, void 0, void 0, function* () {
                    if (error.code === 4902 && typeof desiredChainIdOrChainParameters !== 'number') {
                        if (!this.provider)
                            throw new Error('No provider');
                        // if we're here, we can try to add a new network
                        return this.provider.request({
                            method: 'wallet_addEthereumChain',
                            params: [Object.assign(Object.assign({}, desiredChainIdOrChainParameters), { chainId: desiredChainIdHex })],
                        });
                    }
                    throw error;
                }));
            }
            catch (error) {
                cancelActivation();
                throw error;
            }
        });
    }
    /** {@inheritdoc Connector.deactivate} */
    deactivate() {
        var _a;
        (_a = this.provider) === null || _a === void 0 ? void 0 : _a.disconnect();
    }
    watchAsset({ address, symbol, decimals, image, }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.provider)
                throw new Error('No provider');
            return this.provider
                .request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20',
                    options: {
                        address,
                        symbol,
                        decimals,
                        image, // A string url of the token logo
                    },
                },
            })
                .then((success) => {
                if (!success)
                    throw new Error('Rejected');
                return true;
            });
        });
    }
}
exports.CoinbaseWallet = CoinbaseWallet;
