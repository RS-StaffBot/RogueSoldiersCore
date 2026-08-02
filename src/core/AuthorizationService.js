const AuthorizationResult = require("../shared/permissions/AuthorizationResult");

class AuthorizationService {
    authorize(requirement, context) {
        if (!requirement) {
            return AuthorizationResult.deny("Permission requirement is required.");
        }

        if (!context) {
            return AuthorizationResult.deny("Authorization context is required.");
        }

        return AuthorizationResult.deny("Authorization evaluation is not implemented.");
    }
}

module.exports = AuthorizationService;
