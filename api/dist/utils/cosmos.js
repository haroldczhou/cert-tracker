"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.entities = exports.database = void 0;
exports.queryAll = queryAll;
const cosmos_1 = require("@azure/cosmos");
const cosmosClient = new cosmos_1.CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    key: process.env.COSMOS_KEY,
});
exports.database = cosmosClient.database('app');
exports.entities = exports.database.container('entities');
function queryAll(query) {
    return __awaiter(this, void 0, void 0, function* () {
        const { resources } = yield exports.entities.items.query(query).fetchAll();
        return resources;
    });
}
//# sourceMappingURL=cosmos.js.map