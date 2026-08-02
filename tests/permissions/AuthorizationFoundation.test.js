const test = require("node:test");
const assert = require("node:assert/strict");

const PermissionIdentifier = require("../../src/shared/permissions/PermissionIdentifier");
const PermissionRequirement = require("../../src/shared/permissions/PermissionRequirement");
const AuthorizationContext = require("../../src/shared/permissions/AuthorizationContext");
const AuthorizationResult = require("../../src/shared/permissions/AuthorizationResult");
const AuthorizationService = require("../../src/core/AuthorizationService");

test("PermissionIdentifier creates valid identifiers", () => {
    assert.equal(
        PermissionIdentifier.create("moderation.ban"),
        "moderation.ban"
    );
});

test("PermissionRequirement stores required permission", () => {
    const requirement = new PermissionRequirement("moderation.ban");

    assert.equal(requirement.permission, "moderation.ban");
});

test("AuthorizationResult creates allow and deny results", () => {
    assert.equal(AuthorizationResult.allow().authorized, true);
    assert.equal(AuthorizationResult.deny("Denied").authorized, false);
});

test("AuthorizationService returns authorization result boundary", () => {
    const service = new AuthorizationService();
    const context = new AuthorizationContext({});
    const requirement = new PermissionRequirement("moderation.ban");

    const result = service.authorize(requirement, context);

    assert.equal(result.authorized, false);
});
