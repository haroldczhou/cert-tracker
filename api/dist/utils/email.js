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
exports.sendEmail = sendEmail;
const communication_email_1 = require("@azure/communication-email");
let client = null;
function getClient() {
    if (!client) {
        const connection = process.env.ACS_CONNECTION_STRING || process.env.COMMUNICATION_CONNECTION_STRING;
        if (!connection)
            throw new Error('Missing ACS connection string (ACS_CONNECTION_STRING)');
        client = new communication_email_1.EmailClient(connection);
    }
    return client;
}
function sendEmail(to, subject, html, plainText) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const sender = process.env.REMINDER_FROM_EMAIL || process.env.ACS_FROM_EMAIL || process.env.EMAIL_SENDER;
        if (!sender)
            throw new Error('Missing sender email (REMINDER_FROM_EMAIL or ACS_FROM_EMAIL)');
        const ec = getClient();
        const message = {
            senderAddress: sender,
            recipients: { to: [{ address: to }] },
            content: { subject, html, plainText: plainText !== null && plainText !== void 0 ? plainText : html.replace(/<[^>]+>/g, '') },
        };
        const poller = yield ec.beginSend(message);
        const res = yield poller.pollUntilDone();
        const providerId = (_b = (_a = res === null || res === void 0 ? void 0 : res.id) !== null && _a !== void 0 ? _a : res === null || res === void 0 ? void 0 : res.messageId) !== null && _b !== void 0 ? _b : 'unknown';
        return providerId;
    });
}
//# sourceMappingURL=email.js.map