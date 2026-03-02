"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firebaseAuthService = void 0;
const firebase_1 = require("../config/firebase");
exports.firebaseAuthService = {
    async verifyIdToken(idToken) {
        const auth = (0, firebase_1.getFirebaseAuth)();
        return auth.verifyIdToken(idToken, true);
    },
};
//# sourceMappingURL=firebaseAuth.service.js.map